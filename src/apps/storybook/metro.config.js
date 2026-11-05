const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const vayyariRoot = path.resolve(projectRoot, '../../vayyari');

config.watchFolders = [vayyariRoot];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    const subpath = moduleName.slice(2);
    const target = path.resolve(vayyariRoot, subpath);
    return context.resolveRequest(context, target, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
