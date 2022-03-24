import { expect } from 'chai';
import { createMemoryFs } from '@file-services/memory';
import { createCjsModuleSystem } from '@file-services/commonjs';

describe('commonjs module system', () => {
  const sampleString = 'named';
  const sampleNumber = 123;
  const sampleObject = { five: 5, running: true };
  const sampleFilePath = '/test/file.js';

  it('exposes values that replaced the "exports" key on "module"', () => {
    const fs = createMemoryFs({
      'numeric.js': `module.exports = ${sampleNumber}`,
      'object.js': `module.exports = ${JSON.stringify(sampleObject)}`,
      'string.js': `module.exports = ${JSON.stringify(sampleString)}`,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(requireModule('/numeric.js')).to.equal(sampleNumber);
    expect(requireModule('/object.js')).to.eql(sampleObject);
    expect(requireModule('/string.js')).to.eql(sampleString);
  });

  it('exposes named keys set on the default "exports" object', () => {
    const fs = createMemoryFs({
      [sampleFilePath]: `
                    module.exports.a = ${sampleNumber}
                    module.exports.b = ${JSON.stringify(sampleObject)}
                `,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(requireModule(sampleFilePath)).to.eql({ a: sampleNumber, b: sampleObject });
  });

  it('exposes values set directly on exports', () => {
    const fs = createMemoryFs({
      [sampleFilePath]: `
                    exports.a = ${sampleNumber}
                    exports.b = ${JSON.stringify(sampleObject)}
                `,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(requireModule(sampleFilePath)).to.eql({ a: sampleNumber, b: sampleObject });
  });

  it('caches module evaluation and returns same exported instances', () => {
    const fs = createMemoryFs({
      [sampleFilePath]: `module.exports = {}`,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    // using `equals` to ensure strict reference equality check
    expect(requireModule(sampleFilePath)).to.equals(requireModule(sampleFilePath));
  });

  it('provides current file path via __filename', () => {
    const fs = createMemoryFs({
      [sampleFilePath]: `module.exports = __filename`,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(requireModule(sampleFilePath)).to.eql(sampleFilePath);
  });

  it('provides current file path via __dirname', () => {
    const fs = createMemoryFs({
      [sampleFilePath]: `module.exports = __dirname`,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(requireModule(sampleFilePath)).to.eql(fs.dirname(sampleFilePath));
  });

  it('injects provided globals', () => {
    const fs = createMemoryFs({
      [sampleFilePath]: `module.exports = injectedValue`,
    });
    const { requireModule } = createCjsModuleSystem({ fs, globals: { injectedValue: 123 } });

    expect(requireModule(sampleFilePath)).to.eql(123);
  });

  it('allows local const declarations to take precedence over injected global', () => {
    const fs = createMemoryFs({
      [sampleFilePath]: `const injectedValue = 456;
module.exports = injectedValue`,
    });
    const { requireModule } = createCjsModuleSystem({ fs, globals: { injectedValue: 123 } });

    expect(requireModule(sampleFilePath)).to.eql(456);
  });

  it('disallows const declarations to override module builtins', () => {
    const fs = createMemoryFs({
      'module.js': `const module = 123;`,
      'exports.js': `const exports = 123;`,
      '__filename.js': `const __filename = 123;`,
      '__dirname.js': `const __dirname = 123;`,
      'require.js': `const require = 123;`,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(() => requireModule('/module.js')).to.throw(`Identifier 'module' has already been declared`);
    expect(() => requireModule('/exports.js')).to.throw(`Identifier 'exports' has already been declared`);
    expect(() => requireModule('/__filename.js')).to.throw(`Identifier '__filename' has already been declared`);
    expect(() => requireModule('/__dirname.js')).to.throw(`Identifier '__dirname' has already been declared`);
    expect(() => requireModule('/require.js')).to.throw(`Identifier 'require' has already been declared`);
  });

  it('injects provided globals post creation', () => {
    const fs = createMemoryFs({
      [sampleFilePath]: `module.exports = injectedValue`,
    });
    const { requireModule, globals } = createCjsModuleSystem({ fs });
    globals['injectedValue'] = 123;

    expect(requireModule(sampleFilePath)).to.eql(123);
  });

  it('allows requiring other js modules', () => {
    const fs = createMemoryFs({
      'index.js': `module.exports = require('./numeric')`,
      'numeric.js': `module.exports = ${sampleNumber}`,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(requireModule('/index.js')).to.eql(sampleNumber);
  });

  it('allows requiring json modules', () => {
    const fs = createMemoryFs({
      'index.js': `module.exports = require('./data.json')`,
      'data.json': `{ "name": "test" }`,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(requireModule('/index.js')).to.eql({ name: 'test' });
  });

  it('allows resolving modules using require.resolve', () => {
    const fs = createMemoryFs({
      'index.js': `module.exports = require.resolve('./target')`,
      'target.js': ``,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(requireModule('/index.js')).to.eql('/target.js');
  });

  it('supports recursive requires', () => {
    const fs = createMemoryFs({
      'a.js': `
                exports.before = ${sampleNumber}
                exports.bAtEval = require('./b').evalTime
                exports.after = ${JSON.stringify(sampleString)}
            `,
      'b.js': `
                const a = require('./a')

                exports.evalTime = {
                    beforeFromA: a.before,
                    afterFromA: a.after
                }
                exports.a = a
            `,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(requireModule('/a.js')).to.eql({
      before: sampleNumber,
      bAtEval: {
        beforeFromA: sampleNumber,
        afterFromA: undefined,
      },
      after: sampleString,
    });

    // after `a.js` completed evaluation, b has access to fields added post its evaluation
    const b = requireModule('/b.js') as { a: { after: string } };
    expect(b.a.after).to.equal(sampleString);
  });

  it('exposes "global" as the global object in each js runtime (browser/worker/node)', () => {
    const fs = createMemoryFs({
      [sampleFilePath]: `module.exports = typeof global`,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(requireModule(sampleFilePath)).to.equal('object');
  });

  it('allows overriding "global" using local decalarations', () => {
    const fs = createMemoryFs({
      [sampleFilePath]: `const global = 123;
module.exports = global;`,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(requireModule(sampleFilePath)).to.equal(123);
  });

  it('allows resolving modules using a custom resolver', () => {
    const fs = createMemoryFs({
      src: {
        'a.js': `module.exports = require('some-package')`,
        'package.js': `module.exports = 'custom package'`,
      },
    });

    const resolver = (_contextPath: string, request: string) => ({
      resolvedFile: request === 'some-package' ? '/src/package.js' : undefined,
      visitedPaths: new Set<string>(),
    });

    const { requireModule } = createCjsModuleSystem({ fs, resolver });

    expect(requireModule('/src/a.js')).to.eql('custom package');
  });

  it('allows injecting pre-evaluated modules directly to the module system', () => {
    const fs = createMemoryFs({
      src: {
        'a.js': `module.exports = require('some-package')`,
      },
    });

    const { requireModule, requireFrom, loadedModules } = createCjsModuleSystem({ fs });

    loadedModules.set('some-package', {
      id: 'some-package',
      filename: 'some-package',
      exports: sampleObject,
      children: [],
    });

    expect(requireModule('some-package')).to.eql(sampleObject);
    expect(requireFrom('/', 'some-package')).to.eql(sampleObject);
    expect(requireModule('/src/a.js')).to.eql(sampleObject);
  });

  it('throws when file does not exist', () => {
    const fs = createMemoryFs();
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(() => requireModule(sampleFilePath)).to.throw('ENOENT');
  });

  it('throws when it cannot resolve a request', () => {
    const fs = createMemoryFs({
      [sampleFilePath]: `module.exports = require('missing')`,
    });
    const { requireModule, requireFrom } = createCjsModuleSystem({ fs });

    expect(() => requireModule(sampleFilePath)).to.throw(`Cannot resolve "missing" in ${sampleFilePath}`);
    expect(() => requireFrom(fs.cwd(), 'missing')).to.throw(`Cannot resolve "missing" in ${fs.cwd()}`);
  });

  it('throws evaluation-time errors', () => {
    const fs = createMemoryFs({
      [sampleFilePath]: `throw new Error('Thanos is coming!')`,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    let caughtError: unknown = undefined;
    expect(() => {
      try {
        requireModule(sampleFilePath);
      } catch (e) {
        caughtError = e;
        throw e;
      }
    }).to.throw(`Thanos is coming!`);

    expect((caughtError as Error)?.stack).to.include(sampleFilePath);
  });

  it('does not cache module if code parsing failed', () => {
    const fs = createMemoryFs({
      [sampleFilePath]: `module.exports = #1#`,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(() => requireModule(sampleFilePath)).to.throw();

    fs.writeFileSync(sampleFilePath, `module.exports = 1`);

    expect(requireModule(sampleFilePath)).to.equal(1);
  });

  it('does not cache module if code evaluation failed', () => {
    const fs = createMemoryFs({
      [sampleFilePath]: `throw new Error('Thanos is coming!')`,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(() => requireModule(sampleFilePath)).to.throw('Thanos is coming!');
    let e: unknown;
    try {
      requireModule(sampleFilePath);
    } catch (error) {
      e = error;
    }
    expect(e).to.haveOwnProperty('filePath', sampleFilePath);

    fs.writeFileSync(sampleFilePath, `module.exports = 1`);

    expect(requireModule(sampleFilePath)).to.equal(1);
  });

  it('does not cache module if json parsing failed', () => {
    const sampleJsonPath = '/package.json';
    const fs = createMemoryFs({
      [sampleJsonPath]: `{ "name": #"test"# }`,
    });
    const { requireModule } = createCjsModuleSystem({ fs });

    expect(() => requireModule(sampleJsonPath)).to.throw();

    fs.writeFileSync(sampleJsonPath, `{ "name": "test" }`);

    expect(requireModule(sampleJsonPath)).to.eql({ name: 'test' });
  });

  it('allows registering to evaluation hooks', () => {
    const aFile = '/a.js';
    const bFile = '/b.js';
    const fs = createMemoryFs({
      [aFile]: `require('./b');`,
      [bFile]: 'module.exports = 5;',
    });
    const callArray: string[] = [];
    const { requireModule } = createCjsModuleSystem({
      fs,
      loadModuleHook: (requireModule) => (modulePath) => {
        callArray.push(modulePath);
        return requireModule(modulePath);
      },
    });

    requireModule(aFile);
    expect(callArray).to.eql([aFile, bFile]);
  });

  it('allows accessing modules cache in require hook', () => {
    const aFile = '/a.js';
    const bFile = '/b.js';
    const cFile = '/c.js';
    const dFile = '/d.js';
    const fs = createMemoryFs({
      [aFile]: `require('./b');`,
      [bFile]: `require('./c');
      require('./d');`,
      [cFile]: `require('./d')`,
      [dFile]: 'module.exports = 5;',
    });
    const callArray: string[] = [];
    const { requireModule } = createCjsModuleSystem({
      fs,
      loadModuleHook: (requireModule) => (modulePath) => {
        callArray.push(modulePath);
        return requireModule(modulePath);
      },
    });

    requireModule(aFile);
    expect(callArray).to.eql([aFile, bFile, cFile, dFile]);
  });

  it('iterates over entire evaluation flow', () => {
    const aFile = '/a.js';
    const bFile = '/b.js';
    const cFile = '/c.js';
    const dFile = '/d.js';
    const eFile = '/e.js';
    const fs = createMemoryFs({
      [aFile]: `require('./b');`,
      [bFile]: `require('./c');
      require('./e');`,
      [cFile]: `require('./d')`,
      [dFile]: `require('./e')`,
      [eFile]: 'module.exports = 5;',
    });
    const callArray: string[] = [];
    const { requireModule } = createCjsModuleSystem({
      fs,
      loadModuleHook: (requireModule) => (modulePath) => {
        callArray.push(modulePath);
        return requireModule(modulePath);
      },
    });

    requireModule(aFile);
    expect(callArray).to.eql([aFile, bFile, cFile, dFile, eFile]);
  });
});
