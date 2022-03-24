import { expect } from 'chai';
import { createMemoryFs } from '@file-services/memory';
import { invalidateModule, createCjsModuleSystem } from '@file-services/commonjs';

describe('managed module system', () => {
  it('invalidates a module', () => {
    const aFile = '/a.js';
    const fs = createMemoryFs({
      [aFile]: `
                let counter = 0;
                module.exports = {
                    get: () => counter,
                    increment: () => ++counter
                }
            `,
    });

    const moduleSystem = createCjsModuleSystem({
      fs,
    });

    type AModuleType = {
      get(): number;
      increment(): void;
    };

    const module = moduleSystem.requireModule(aFile) as AModuleType;
    module.increment();
    invalidateModule(aFile, moduleSystem.loadedModules);
    const reEvaluatedModule = moduleSystem.requireModule(aFile) as AModuleType;
    expect(reEvaluatedModule.get()).to.eq(0);
  });

  it('invalidates parent module when invalidating a dependent module', () => {
    const aFile = '/a.js';
    const bFile = '/b.js';
    const fs = createMemoryFs({
      [aFile]: `
        let counter = 0;
        module.exports = {
            get: () => counter,
            increment: () => ++counter
        }
            `,
      [bFile]: `
        const { get, increment } = require('./a');
        module.exports = { get, increment }
        `,
    });

    const moduleSystem = createCjsModuleSystem({
      fs,
    });

    type ModuleType = {
      get(): number;
      increment(): void;
    };

    const module = moduleSystem.requireModule(bFile) as ModuleType;
    module.increment();
    invalidateModule(aFile, moduleSystem.loadedModules);
    const reEvaluatedModule = moduleSystem.requireModule(bFile) as ModuleType;
    expect(reEvaluatedModule.get()).to.eq(0);
  });

  it('invalidates modules deep', () => {
    const aFile = '/a.js';
    const bFile = '/b.js';
    const cFile = '/c.js';
    const dFile = '/d.js';
    const eFile = '/e.js';
    const fFile = '/f.js';

    const fs = createMemoryFs({
      [aFile]: `require('./b');
      require('./f');`,
      [bFile]: `require('./c');`,
      [cFile]: `require('./d');`,
      [dFile]: `require('./e');`,
      [eFile]: `module.exports = 5;`,
      [fFile]: `require('./c');`,
    });

    const moduleSystem = createCjsModuleSystem({
      fs,
    });

    moduleSystem.requireModule(aFile);

    invalidateModule(cFile, moduleSystem.loadedModules);
    expect(moduleSystem.loadedModules.get(cFile)).to.be.undefined;
    expect(moduleSystem.loadedModules.get(bFile)).to.be.undefined;
    expect(moduleSystem.loadedModules.get(aFile)).to.be.undefined;
    expect(moduleSystem.loadedModules.get(fFile)).to.be.undefined;
    expect(moduleSystem.loadedModules.get(eFile)).to.not.be.undefined;
    expect(moduleSystem.loadedModules.get(dFile)).to.not.be.undefined;
  });

  it('allows wrapping the require call', () => {
    const aFile = '/a.js';
    const bFile = '/b.js';
    const fs = createMemoryFs({
      [aFile]: `module.exports = 5;`,
      [bFile]: `module.exports = require('./a');`,
    });
    let counter = 0;

    const moduleSystem = createCjsModuleSystem({
      fs,
      loadModuleHook: (require) => (modulePath) => {
        counter++;
        return require(modulePath);
      },
    });

    moduleSystem.requireModule(aFile);
    expect(counter).to.eq(1);
    invalidateModule(aFile, moduleSystem.loadedModules);
    moduleSystem.requireModule(bFile);
    expect(counter).to.eq(3);
  });
});
