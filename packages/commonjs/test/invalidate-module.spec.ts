import { expect } from "chai";
import { createMemoryFs } from "@file-services/memory";
import { invalidateModule, createCjsModuleSystem } from "@file-services/commonjs";

type ModuleShape = {
  get(): number;
  increment(): void;
};

describe("invalidateModule", () => {
  it("invalidates a module", () => {
    const aFile = "/a.js";
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

    const module = moduleSystem.requireModule(aFile) as ModuleShape;
    module.increment();
    invalidateModule(aFile, moduleSystem.moduleCache);
    const reEvaluatedModule = moduleSystem.requireModule(aFile) as ModuleShape;
    expect(reEvaluatedModule.get()).to.eq(0);
  });

  it("invalidates parent module when invalidating a dependent module", () => {
    const aFile = "/a.js";
    const bFile = "/b.js";
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

    const module = moduleSystem.requireModule(bFile) as ModuleShape;
    module.increment();
    invalidateModule(aFile, moduleSystem.moduleCache);
    const reEvaluatedModule = moduleSystem.requireModule(bFile) as ModuleShape;
    expect(reEvaluatedModule.get()).to.eq(0);
  });

  it("invalidates modules deep", () => {
    const aFile = "/a.js";
    const bFile = "/b.js";
    const cFile = "/c.js";
    const dFile = "/d.js";
    const eFile = "/e.js";
    const fFile = "/f.js";

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

    invalidateModule(cFile, moduleSystem.moduleCache);
    const moduleSystemKeys = [...moduleSystem.moduleCache.keys()];

    expect(moduleSystemKeys).to.not.include(cFile);
    expect(moduleSystemKeys).to.not.include(bFile);
    expect(moduleSystemKeys).to.not.include(aFile);
    expect(moduleSystemKeys).to.not.include(fFile);
    expect(moduleSystemKeys).to.include(dFile);
    expect(moduleSystemKeys).to.include(eFile);
  });

  it("allows wrapping the require call", () => {
    const aFile = "/a.js";
    const bFile = "/b.js";
    const fs = createMemoryFs({
      [aFile]: `module.exports = 5;`,
      [bFile]: `module.exports = require('./a');`,
    });
    const evaluatedModules: string[] = [];

    const moduleSystem = createCjsModuleSystem({
      fs,
      loadModuleHook: (require) => (modulePath) => {
        evaluatedModules.push(modulePath);
        return require(modulePath);
      },
    });

    moduleSystem.requireModule(aFile);
    expect(evaluatedModules).to.eql([aFile]);
    invalidateModule(aFile, moduleSystem.moduleCache);
    moduleSystem.requireModule(bFile);
    expect(evaluatedModules).to.eql([aFile, bFile, aFile]);
  });
});
