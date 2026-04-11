const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function getAuditRoot(rootDir = process.cwd()) {
  return path.resolve(rootDir, 'supabase', 'audit');
}

function getActiveArtifactsDir(rootDir = process.cwd()) {
  return ensureDir(path.join(getAuditRoot(rootDir), 'artifacts'));
}

function getHistoricalJsonArchiveDir(rootDir = process.cwd()) {
  return ensureDir(path.join(getAuditRoot(rootDir), 'archive', 'json'));
}

function getReferenceDir(rootDir = process.cwd()) {
  return ensureDir(path.join(getAuditRoot(rootDir), 'reference'));
}

function getNamedReferenceDir(name, rootDir = process.cwd()) {
  return ensureDir(path.join(getReferenceDir(rootDir), name));
}

function buildActiveArtifactPath(fileName, rootDir = process.cwd()) {
  return path.join(getActiveArtifactsDir(rootDir), fileName);
}

function buildReferencePath(referenceGroup, fileName, rootDir = process.cwd()) {
  return path.join(getNamedReferenceDir(referenceGroup, rootDir), fileName);
}

module.exports = {
  buildActiveArtifactPath,
  buildReferencePath,
  getActiveArtifactsDir,
  getAuditRoot,
  getHistoricalJsonArchiveDir,
  getNamedReferenceDir,
  getReferenceDir,
};