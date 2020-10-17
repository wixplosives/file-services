import os from 'os';
import readline from 'readline';
import stream from 'stream';
import { expect } from 'chai';
import fs from '@file-services/node';
import path from '@file-services/path';
import { createCjsModuleSystem } from '@file-services/commonjs';

describe('commonjs module system - integration with existing npm packages', function () {
  this.timeout(10_000); // 10s

  it('evaluates react/react-dom successfully', () => {
    const { requireFrom } = createCjsModuleSystem({ fs });

    const React = requireFrom(__dirname, 'react') as typeof import('react');
    const ReactDOM = requireFrom(__dirname, 'react-dom') as typeof import('react-dom');

    expect(React.createElement).to.be.instanceOf(Function);
    expect(React.Component).to.be.instanceOf(Function);
    expect(ReactDOM.render).to.be.instanceOf(Function);
  });

  it('evaluates chai successfully', () => {
    const { requireFrom } = createCjsModuleSystem({ fs });

    const chai = requireFrom(__dirname, 'chai') as typeof import('chai');

    expect(chai.expect).to.be.instanceOf(Function);
    expect(chai.use).to.be.instanceOf(Function);
  });

  it('evaluates postcss successfully', () => {
    const { requireFrom, loadedModules } = createCjsModuleSystem({ fs });
    loadedModules.set('path', { filename: 'path', id: 'path', exports: path });
    const postcss = requireFrom(__dirname, 'postcss') as typeof import('postcss');

    expect(postcss.parse).to.be.instanceOf(Function);
  });

  it('evaluates typescript successfully', () => {
    const { requireFrom } = createCjsModuleSystem({ fs });

    const ts = requireFrom(__dirname, 'typescript') as typeof import('typescript');

    expect(ts.transpileModule).to.be.instanceOf(Function);
  });

  it('evaluates mocha successfully', () => {
    const { requireFrom, loadedModules } = createCjsModuleSystem({ fs });
    loadedModules.set('path', { filename: 'path', id: 'path', exports: path });
    loadedModules.set('stream', { filename: 'stream', id: 'stream', exports: stream });
    const browserMocha = requireFrom(__dirname, 'mocha') as typeof mocha;

    expect(browserMocha.setup).to.be.instanceOf(Function);
  });

  // somehow messes up fs, causing other tests to fail in repo-wide test-run
  it.skip('evaluates sass successfully', () => {
    const { requireFrom, loadedModules } = createCjsModuleSystem({ fs });
    loadedModules.set('path', { filename: 'path', id: 'path', exports: path });
    loadedModules.set('fs', { filename: 'fs', id: 'fs', exports: fs });
    loadedModules.set('stream', { filename: 'stream', id: 'stream', exports: stream });
    loadedModules.set('os', { filename: 'os', id: 'os', exports: os });
    loadedModules.set('readline', { filename: 'readline', id: 'readline', exports: readline });

    const sass = requireFrom(__dirname, 'sass') as typeof import('sass');

    expect(sass.render).to.be.instanceOf(Function);
    expect(sass.renderSync).to.be.instanceOf(Function);
  });
});
