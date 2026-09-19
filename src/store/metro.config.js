const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const storeNodeModules = path.resolve(projectRoot, 'node_modules');
const storeTheme = path.resolve(projectRoot, 'src/theme');

config.resolver.nodeModulesPaths = [storeNodeModules];
config.resolver.disableHierarchicalLookup = true;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // 1. Force singleton Theme: redirect any component imports to store's theme
  if (
    context.originModulePath &&
    context.originModulePath.includes('/apps/storybook/') &&
    (moduleName === '../../theme' || moduleName === '../../../theme' || moduleName.endsWith('/theme'))
  ) {
    return {
      filePath: path.resolve(storeTheme, 'index.ts'),
      type: 'sourceFile',
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
