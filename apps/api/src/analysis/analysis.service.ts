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
  functions: string[];
  classes: string[];
  imports: string[];
  stats: {
    functions: number;
    classes: number;
    imports: number;
  };
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    totalFiles: number;
    totalFunctions: number;
    totalClasses: number;
    totalImports: number;
    totalEdges: number;
    analysisTimeMs: number;
  };
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
    const startTime = performance.now();
    const filePathSet = new Set(parsedFiles.map((f) => f.filePath));

    const nodes: GraphNode[] = parsedFiles.map((f) => ({
      id: f.filePath,
      label: path.basename(f.filePath),
      functions: f.functions,
      classes: f.classes,
      imports: f.imports,
      stats: {
        functions: f.functions.length,
        classes: f.classes.length,
        imports: f.imports.length,
      },
    }));

    const edges: GraphEdge[] = [];

    for (const file of parsedFiles) {
      for (const imp of file.imports) {
        if (!imp.startsWith('.')) continue;
        const resolved = this.resolveImport(file.filePath, imp, filePathSet);
        if (resolved) {
          edges.push({ source: file.filePath, target: resolved });
        }
      }
    }

    const analysisTimeMs = Math.round(performance.now() - startTime);

    return {
      nodes,
      edges,
      summary: {
        totalFiles: parsedFiles.length,
        totalFunctions: parsedFiles.reduce((sum, f) => sum + f.functions.length, 0),
        totalClasses: parsedFiles.reduce((sum, f) => sum + f.classes.length, 0),
        totalImports: parsedFiles.reduce((sum, f) => sum + f.imports.length, 0),
        totalEdges: edges.length,
        analysisTimeMs,
      },
    };
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
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);

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
        for (const member of node.members) {
          if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
            functions.push(`${node.name.text}.${member.name.text}`);
          }
          if (ts.isConstructorDeclaration(member)) {
            functions.push(`${node.name.text}.constructor`);
          }
        }
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
