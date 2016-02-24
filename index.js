#! /usr/bin/env node

// Imports
var temp = require('temp');
var Fs   = require('fs');
var Path = require('path');
var ncp = require('ncp').ncp;
var rimraf = require('rimraf');
var combineSCSS = require('scss-combine');
var execSync = require('child_process').execSync;

// Command line arguments
var arguments = process.argv.slice(2);

if (arguments.length !== 1) {
  console.log('Usage: bc-bundle <path>');
  process.exit(0);
}

var themePath = Path.resolve(arguments[0]);
var packagePath = Path.join(themePath, 'package.json');
var package = require(packagePath);
var bundleFilename = package.name + '-' + package.version + '.zip';
var bundleOutputPath = Path.join(process.cwd(), bundleFilename);
var banner = '/*! Theme: '+ package.name + ' |  v' + package.version + ' */\n';

// Automatically track and cleanup files at exit
temp.track();

temp.mkdir(package.name, function(error, tempPath) {
  console.log('Duplicating theme...');

  if (error) {
    return console.error(error);
  }

  ncp(themePath, tempPath, function(error){
    if (error) {
      return console.error(error);
    }

    // Combine styles
    console.log('Combining styles...');
    var scssPath = Path.join(tempPath, 'assets', 'scss', 'theme.scss');
    var combinedScssPath = Path.join(tempPath, 'theme.scss');
    var combinedScss = banner + combineSCSS(scssPath);

    // Delete uncombined styles
    var stylesPath = Path.join(tempPath, 'assets', 'scss', '*');
    rimraf.sync(stylesPath);

    // Write combined styles
    Fs.writeFileSync(scssPath, combinedScss);

    // Installing dependencies
    console.log('Installing dependencies...');
    execSync('npm install', { cwd:tempPath });
    execSync('jspm install', { cwd:tempPath });

    // Bundle
    console.log('Bundling theme...');
    execSync('stencil bundle', { cwd:tempPath });

    var bundlePath = Path.join(tempPath, bundleFilename);
    ncp(bundlePath, bundleOutputPath, function(error){
      if (error) {
        return console.error(error);
      }
    });
  });
});
