/*global Package*/
Package.describe({
  name: 'dschnare:meteor-components-ioc-plugin',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'A plugin for Meteor Components that integrates IOC Containers.',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript', 'client');
  api.use([
    'dschnare:meteor-components@0.5.0',
    'dschnare:ioc-container@0.1.3'
  ], 'client', { weak: true });
  api.addFiles('meteor-components-ioc-plugin.js', 'client');
  api.export('ComponentRootIoc', 'client');
});

Package.onTest(function(api) {
  api.use('ecmascript', 'client');
  api.use('tinytest', 'client');
  api.use('dschnare:meteor-components-ioc-plugin', 'client');
  api.addFiles('meteor-components-ioc-plugin-tests.js', 'client');
});
