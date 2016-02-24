#! /usr/bin/env node

// Imports
var temp = require('temp');
var Fs   = require('fs');
var Path = require('path');
var ncp = require('ncp').ncp;
var glob = require('glob');
var rimraf = require('rimraf');
var combineSCSS = require('scss-combine');
var execSync = require('child_process').execSync;

// Recursively remove empty directories
function rmdirEmpty(root) {
  Fs.readdirSync(root).forEach(function(file){
    var path = Path.join(root, file);
    var stat = Fs.statSync(path);

    if (stat.isDirectory()) {
      rmdirEmpty(path);

      var children = Fs.readdirSync(path);
      if (!children.length) Fs.rmdirSync(path);
    }
  });
}

// Command line arguments
var arguments = process.argv.slice(2);

if (arguments.length !== 1) {
  console.log('Usage: bc-bundle <path>');
  process.exit(0);
}

var themePath = Path.resolve(arguments[0]);
var config = require(Path.join(themePath, 'config.json'));
var bundleFilename = config.name + '-' + config.version + '.zip';
var bundleOutputPath = Path.join(process.cwd(), bundleFilename);
var banner = '/*! Theme: '+ config.name + ' v' + config.version + ' */\n';
console.log('Bundling:', config.name, config.version);

// Automatically track and cleanup files at exit
temp.track();

temp.mkdir(config.name, function(error, tempPath) {
  if (error) return console.error(error);
  console.log('Duplicating theme...');

  ncp(themePath, tempPath, function(error){
    if (error) return console.error(error);

    // Install dependencies
    console.log('Installing dependencies...');
    execSync('npm install', { cwd:tempPath });
    execSync('jspm install', { cwd:tempPath });

    // Combine styles
    console.log('Combining styles...');
    var scssPath = Path.join(tempPath, 'assets', 'scss');
    var stylesheets = glob.sync('**/[^_]*.scss', { cwd:scssPath });
    console.log('', stylesheets.join(' '));

    stylesheets.forEach(function(stylesheet){
      var path = Path.join(scssPath, stylesheet);
      var combined = banner + combineSCSS(path);
      Fs.writeFileSync(path, combined);
    });

    // Delete uncombined styles
    rimraf.sync(Path.join(tempPath, 'assets', 'scss', '**/_*.scss'));
    rmdirEmpty(scssPath);

    // Bundle
    console.log('Bundling theme...');
    execSync('stencil bundle', { cwd:tempPath });

    // Save bundled zip
    ncp(Path.join(tempPath, bundleFilename), bundleOutputPath, function(error){
      if (error) return console.error(error);
    });
  });
});
