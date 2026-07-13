import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

export interface ParsedFile {
  filePath: string;
  functions: string[];
  classes: string[];
  imports: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  functions: number;
  classes: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

@Injectable()
export class AnalysisService {
  private readonly extensions = ['.ts', '.tsx', '.js', '.jsx'];
  private readonly ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.next'];

  analyzeRepo(rootDir: string): ParsedFile[] {
    const files = this.walkDir(rootDir);
    return files.map((filePath) => this.parseFile(filePath, rootDir));
  }

  buildGraph(parsedFiles: ParsedFile[]): DependencyGraph {
    const filePathSet = new Set(parsedFiles.map((f) => f.filePath));

    const nodes: GraphNode[] = parsedFiles.map((f) => ({
      id: f.filePath,
      label: path.basename(f.filePath),
      functions: f.functions.length,
      classes: f.classes.length,
    }));

    const edges: GraphEdge[] = [];

    for (const file of parsedFiles) {
      for (const imp of file.imports) {
        // only care about relative imports (internal repo files), skip external packages
        if (!imp.startsWith('.')) continue;

        const resolved = this.resolveImport(file.filePath, imp, filePathSet);
        if (resolved) {
          edges.push({ source: file.filePath, target: resolved });
        }
      }
    }

    return { nodes, edges };
  }

  private resolveImport(fromFile: string, importPath: string, filePathSet: Set<string>): string | null {
    const fromDir = path.dirname(fromFile);
    const base = path.normalize(path.join(fromDir, importPath));

    const candidates = [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.js`,
      `${base}.jsx`,
      path.join(base, 'index.ts'),
      path.join(base, 'index.tsx'),
      path.join(base, 'index.js'),
    ];

    for (const candidate of candidates) {
      const normalized = candidate.split(path.sep).join('/');
      if (filePathSet.has(normalized)) return normalized;
    }
    return null;
  }

  private walkDir(dir: string): string[] {
    let results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!this.ignoreDirs.includes(entry.name)) {
          results = results.concat(this.walkDir(fullPath));
        }
      } else if (this.extensions.includes(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
    return results;
  }

  private parseFile(filePath: string, rootDir: string): ParsedFile {
    const source = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true,
    );

    const functions: string[] = [];
    const classes: string[] = [];
    const imports: string[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        functions.push(node.name.text);
      }
      if (
        ts.isVariableDeclaration(node) &&
        node.initializer &&
        (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) &&
        ts.isIdentifier(node.name)
      ) {
        functions.push(node.name.text);
      }
      if (ts.isClassDeclaration(node) && node.name) {
        classes.push(node.name.text);
      }
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push(node.moduleSpecifier.text);
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      filePath: path.relative(rootDir, filePath).split(path.sep).join('/'),
      functions,
      classes,
      imports,
    };
  }
}
