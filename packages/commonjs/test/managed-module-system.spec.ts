import { expect } from 'chai';
import { createMemoryFs } from '@file-services/memory';
import { createManagedCjsModuleSystem, createManagedBaseCjsModuleSystem } from '@file-services/commonjs';

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

    const moduleSystem = createManagedCjsModuleSystem({
      fs,
    });

    type AModuleType = {
      get(): number;
      increment(): void;
    };

    const module = moduleSystem.requireModule(aFile) as AModuleType;
    module.increment();
    moduleSystem.invalidateModule(aFile);
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

    const moduleSystem = createManagedCjsModuleSystem({
      fs,
    });

    type ModuleType = {
      get(): number;
      increment(): void;
    };

    const module = moduleSystem.requireModule(bFile) as ModuleType;
    module.increment();
    moduleSystem.invalidateModule(aFile);
    const reEvaluatedModule = moduleSystem.requireModule(bFile) as ModuleType;
    expect(reEvaluatedModule.get()).to.eq(0);
  });

  it('invalidates modules deep', () => {
    const aFile = '/a.js';
    const bFile = '/b.js';
    const cFile = '/c.js';
    const dFile = '/d.js';
    const eFile = '/e.js';
    const evalCounter: Record<string, number> = {};
    const countEval = (modulePath: string) => {
      const counterValue = evalCounter[modulePath] ?? 0;
      evalCounter[modulePath] = counterValue + 1;
    };
    const fs = createMemoryFs({
      [aFile]: `require('./b');`,
      [bFile]: `require('./c');`,
      [cFile]: `require('./d');`,
      [dFile]: `require('./e');`,
      [eFile]: `module.exports = 5;`,
    });

    const moduleSystem = createManagedBaseCjsModuleSystem({
      globals: {
        countEval,
      },
      dirname: fs.dirname,
      readFileSync: (filePath) => `${fs.readFileSync(filePath, 'utf8')}
      countEval(__filename);`,
      resolveFrom: (_, r) => r.slice(1) + '.js',
    });

    moduleSystem.requireModule(aFile);
    Object.entries(evalCounter).map(([filePath, counter]) => expect(counter, `${filePath} wasn't evaluated`).to.eq(1));

    moduleSystem.invalidateModule(cFile);
    expect(evalCounter[cFile], `file ${cFile} wasn't evaluated twice`).to.eq(2);
    expect(evalCounter[bFile], `file ${bFile} wasn't evaluated twice`).to.eq(2);
    expect(evalCounter[aFile], `file ${aFile} wasn't evaluated twice`).to.eq(2);
    expect(evalCounter[dFile], `file ${dFile} was evaluated more then once`).to.eq(1);
    expect(evalCounter[eFile], `file ${eFile} was evaluated more then once`).to.eq(1);
  });

  it('allows wrapping the require call', () => {
    const aFile = '/a.js';
    const bFile = '/b.js';
    const fs = createMemoryFs({
      [aFile]: `module.exports = 5;`,
      [bFile]: `module.exports = require('./a');`,
    });
    let counter = 0;

    const moduleSystem = createManagedCjsModuleSystem({
      fs,
      wrapRequire: (require) => (modulePath) => {
        counter++;
        return require(modulePath);
      },
    });

    moduleSystem.requireModule(bFile);
    expect(counter).to.eq(1);
    moduleSystem.invalidateModule(aFile);
    expect(counter).to.eq(3);
  });
});
