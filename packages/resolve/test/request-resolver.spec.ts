import chai, { expect } from 'chai';
import type { PackageJson } from 'type-fest';
import { createMemoryFs } from '@file-services/memory';
import { createRequestResolver } from '@file-services/resolve';
import { resolutionMatchers } from './resolution-matchers.js';

chai.use(resolutionMatchers);
const stringifyPackageJson = (packageJson: PackageJson) => JSON.stringify(packageJson);
const EMPTY = '';

describe('request resolver', () => {
  describe('files', () => {
    it('resolves requests to any file if extension is specified', () => {
      const fs = createMemoryFs({
        src: {
          'typed.ts': EMPTY,
          'file.js': EMPTY,
          'data.json': EMPTY,
        },
        'style.css': EMPTY,
        'image.jpg': EMPTY,
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', './src/file.js')).to.be.resolvedTo('/src/file.js');
      expect(resolveRequest('/src', './data.json')).to.be.resolvedTo('/src/data.json');
      expect(resolveRequest('/src', './typed.ts')).to.be.resolvedTo('/src/typed.ts');
      expect(resolveRequest('/', './style.css')).to.be.resolvedTo('/style.css');
      expect(resolveRequest('/', './image.jpg')).to.be.resolvedTo('/image.jpg');
      expect(resolveRequest('/', './non-existing.svg')).to.be.resolvedTo(undefined);
    });

    it('resolves requests to js and json files without specified extension', () => {
      const fs = createMemoryFs({
        src: {
          'file.js': EMPTY,
          'style.css.js': EMPTY,
        },
        'data.json': EMPTY,
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', './src/file')).to.be.resolvedTo('/src/file.js');
      expect(resolveRequest('/', './data')).to.be.resolvedTo('/data.json');
      expect(resolveRequest('/src', './style.css')).to.be.resolvedTo('/src/style.css.js');
      expect(resolveRequest('/src', '../data')).to.be.resolvedTo('/data.json');
    });

    it('allows specifying custom extensions for resolution', () => {
      const fs = createMemoryFs({
        src: {
          'same_name.tsx': EMPTY,
          'same_name.ts': EMPTY,
        },
        'file.ts': EMPTY,
        'another.tsx': EMPTY,
        'style.css.ts': EMPTY,
        'now_ignored.js': EMPTY,
      });
      const resolveRequest = createRequestResolver({ fs, extensions: ['.ts', '.tsx'] });

      expect(resolveRequest('/', './file')).to.be.resolvedTo('/file.ts');
      expect(resolveRequest('/', './another')).to.be.resolvedTo('/another.tsx');
      expect(resolveRequest('/src', '../style.css')).to.be.resolvedTo('/style.css.ts');
      expect(resolveRequest('/', './now_ignored')).to.be.resolvedTo(undefined);

      // picked due to order of provided extensions array
      expect(resolveRequest('/src', './same_name')).to.be.resolvedTo('/src/same_name.ts');
    });

    it('resolves requests to absolute paths', () => {
      const fs = createMemoryFs({
        src: {
          folder: {
            'file.js': EMPTY,
          },
        },
        folder: {
          'file.js': EMPTY,
        },
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/request/origin/matters/not', '/folder/file')).to.be.resolvedTo('/folder/file.js');
      // next one ensures we don't accidently resolve absolute paths using path.join
      // which would result in '/src/folder/file.js' instead
      expect(resolveRequest('/src', '/folder/file')).to.be.resolvedTo('/folder/file.js');
    });

    it('resolves requests to files across folders', () => {
      const fs = createMemoryFs({
        src: {
          'file.js': EMPTY,
        },
        'another.js': EMPTY,
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', './src/file')).to.be.resolvedTo('/src/file.js');
      expect(resolveRequest('/demo', '../src/file')).to.be.resolvedTo('/src/file.js');
      expect(resolveRequest('/src/inner', '../file')).to.be.resolvedTo('/src/file.js');
      expect(resolveRequest('/src/inner', '../../another')).to.be.resolvedTo('/another.js');
    });

    it('resolves requests to dot files', () => {
      const fs = createMemoryFs({
        '.npmrc': EMPTY,
        '.js': EMPTY,
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', './.npmrc')).to.be.resolvedTo('/.npmrc');
      // even if dot file is named as possible extension (which is probably improbable)
      expect(resolveRequest('/', './.js')).to.be.resolvedTo('/.js');
    });
  });

  describe('folders', () => {
    it('resolves requests to a folder if it contains an index file', () => {
      const fs = createMemoryFs({
        src: {
          'index.js': EMPTY,
        },
        data: {
          'index.json': EMPTY,
        },
        typed: {
          'index.ts': EMPTY,
        },
      });
      const resolveRequest = createRequestResolver({ fs, extensions: ['.ts', '.js', '.json'] });

      expect(resolveRequest('/', './src')).to.be.resolvedTo('/src/index.js');
      expect(resolveRequest('/', './data')).to.be.resolvedTo('/data/index.json');
      expect(resolveRequest('/', './typed')).to.be.resolvedTo('/typed/index.ts');
      expect(resolveRequest('/src', '.')).to.be.resolvedTo('/src/index.js');
      expect(resolveRequest('/src/inside', '..')).to.be.resolvedTo('/src/index.js');
    });

    it('resolves requests to a folder if it contains a package.json with a main', () => {
      const fs = createMemoryFs({
        with_ext: {
          'package.json': stringifyPackageJson({ main: 'entry.js' }),
          'entry.js': EMPTY,
        },
        without_ext: {
          'package.json': stringifyPackageJson({ main: 'main_file' }),
          'main_file.js': EMPTY,
        },
        to_inner_folder: {
          inner: { 'index.js': EMPTY },
          'package.json': stringifyPackageJson({ main: 'inner' }),
        },
        to_file_in_folder: {
          inner: { 'file.js': EMPTY },
          'package.json': stringifyPackageJson({ main: 'inner/file.js' }),
        },
        preferred: {
          'package.json': stringifyPackageJson({ main: 'preferred.js' }),
          'preferred.js': 'will be picked over index',
          'index.js': EMPTY,
        },
        dot_main: {
          'package.json': stringifyPackageJson({ main: '.' }),
          'index.js': EMPTY,
        },
        empty_main: {
          'package.json': stringifyPackageJson({ main: '' }),
          'index.js': EMPTY,
        },
        missing_main: {
          'package.json': stringifyPackageJson({ main: './missing' }),
        },
        invalid_json: {
          'package.json': '#invalid json#',
          'index.js': EMPTY,
        },
        invalid_json_no_index: {
          'package.json': '#invalid json#',
        },
        no_main: {
          'package.json': stringifyPackageJson({}),
          'index.js': EMPTY,
        },
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', './with_ext')).to.be.resolvedTo('/with_ext/entry.js');
      expect(resolveRequest('/', './without_ext')).to.be.resolvedTo('/without_ext/main_file.js');
      expect(resolveRequest('/', './to_file_in_folder')).to.be.resolvedTo('/to_file_in_folder/inner/file.js');
      expect(resolveRequest('/', './to_inner_folder')).to.be.resolvedTo('/to_inner_folder/inner/index.js');
      expect(resolveRequest('/', './preferred')).to.be.resolvedTo('/preferred/preferred.js');
      expect(resolveRequest('/', './dot_main')).to.be.resolvedTo('/dot_main/index.js');
      expect(resolveRequest('/', './empty_main')).to.be.resolvedTo('/empty_main/index.js');
      expect(resolveRequest('/', './missing_main')).to.be.resolvedTo(undefined);
      expect(resolveRequest('/', './invalid_json')).to.be.resolvedTo('/invalid_json/index.js');
      expect(resolveRequest('/', './invalid_json_no_index')).to.be.resolvedTo(undefined);
      expect(resolveRequest('/', './no_main')).to.be.resolvedTo('/no_main/index.js');
    });
  });

  describe('packages', () => {
    it('resolves requests to packages in node_modules', () => {
      const fs = createMemoryFs({
        node_modules: {
          express: {
            'package.json': stringifyPackageJson({ main: 'main.js' }),
            'main.js': EMPTY,
            'another_entry.js': EMPTY,
          },
          lodash: {
            'package.json': stringifyPackageJson({ main: 'some-index' }),
            'some-index.js': EMPTY,
            'test-utils': {
              'index.js': EMPTY,
              'util1.js': EMPTY,
            },
          },
          'missing-main': {
            'package.json': stringifyPackageJson({ main: 'main.js' }),
          },
          'just-a-file.js': EMPTY,
        },
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', 'express')).to.be.resolvedTo('/node_modules/express/main.js');

      expect(resolveRequest('/', 'not-existing')).to.be.resolvedTo(undefined);
      expect(resolveRequest('/', 'missing-main')).to.be.resolvedTo(undefined);

      // alternative entry point
      expect(resolveRequest('/', 'express/another_entry')).to.be.resolvedTo('/node_modules/express/another_entry.js');

      expect(resolveRequest('/', 'lodash')).to.be.resolvedTo('/node_modules/lodash/some-index.js');

      // sub-folder of a package
      expect(resolveRequest('/', 'lodash/test-utils')).to.be.resolvedTo('/node_modules/lodash/test-utils/index.js');

      // file in a sub-folder of a package
      expect(resolveRequest('/', 'lodash/test-utils/util1')).to.be.resolvedTo(
        '/node_modules/lodash/test-utils/util1.js'
      );

      // should also be resolved to match node behavior
      expect(resolveRequest('/', 'just-a-file')).to.be.resolvedTo('/node_modules/just-a-file.js');
    });

    it('resolves requests correctly when two versions of same package exist in tree', () => {
      const fs = createMemoryFs({
        node_modules: {
          express: {
            node_modules: {
              lodash: {
                'package.json': stringifyPackageJson({ main: 'v1.js' }),
                'v1.js': EMPTY,
              },
            },
            'package.json': stringifyPackageJson({ main: 'main.js' }),
            'main.js': EMPTY,
          },
          lodash: {
            'package.json': stringifyPackageJson({ main: 'v2.js' }),
            'v2.js': EMPTY,
            'v2-specific-file.js': EMPTY,
          },
        },
      });

      const resolveRequest = createRequestResolver({ fs });

      // local node_modules package overshadows the top level one
      expect(resolveRequest('/node_modules/express', 'lodash')).to.be.resolvedTo(
        '/node_modules/express/node_modules/lodash/v1.js'
      );

      // root still gets v2
      expect(resolveRequest('/', 'lodash')).to.be.resolvedTo('/node_modules/lodash/v2.js');

      // file only exists in top level package (ugly, but matches node's behavior)
      expect(resolveRequest('/node_modules/express', 'lodash/v2-specific-file')).to.be.resolvedTo(
        '/node_modules/lodash/v2-specific-file.js'
      );
    });

    it('resolves requests to scoped packages', () => {
      const fs = createMemoryFs({
        node_modules: {
          '@stylable': {
            cli: {
              'index.js': EMPTY,
              'test-utils.js': EMPTY,
            },
          },
        },
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', '@stylable/cli')).to.be.resolvedTo('/node_modules/@stylable/cli/index.js');

      expect(resolveRequest('/', '@stylable/cli/test-utils')).to.be.resolvedTo(
        '/node_modules/@stylable/cli/test-utils.js'
      );
    });

    it('allows specifying custom packages roots', () => {
      const fs = createMemoryFs({
        project: {
          third_party: {
            koa: {
              'package.json': stringifyPackageJson({ main: 'main-index' }),
              'main-index.js': EMPTY,
            },
          },
        },
        root_libs: {
          react: {
            'index.js': EMPTY,
          },
        },
      });
      const resolveRequest = createRequestResolver({ fs, packageRoots: ['third_party', '/root_libs'] });

      expect(resolveRequest('/project', 'koa')).to.be.resolvedTo('/project/third_party/koa/main-index.js');

      expect(resolveRequest('/project', 'react')).to.be.resolvedTo('/root_libs/react/index.js');
    });
  });

  describe('browser field (string)', () => {
    it('prefers "browser" over "main" when loading a package.json', () => {
      const fs = createMemoryFs({
        lodash: {
          'package.json': stringifyPackageJson({ main: 'entry.js', browser: './browser.js' }),
          'entry.js': EMPTY,
          'browser.js': EMPTY,
        },
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', './lodash')).to.be.resolvedTo('/lodash/browser.js');
    });

    it('uses "browser" if "main" was not defined', () => {
      const fs = createMemoryFs({
        lodash: {
          'package.json': stringifyPackageJson({ browser: 'file.js' }),
          'file.js': EMPTY,
        },
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', './lodash')).to.be.resolvedTo('/lodash/file.js');
    });

    it('prefers "main" when resolution "target" is set to "node"', () => {
      const fs = createMemoryFs({
        lodash: {
          'package.json': stringifyPackageJson({ main: 'entry.js', browser: './browser.js' }),
          'entry.js': EMPTY,
          'browser.js': EMPTY,
        },
      });
      const resolveRequest = createRequestResolver({ fs, target: 'node' });

      expect(resolveRequest('/', './lodash')).to.be.resolvedTo('/lodash/entry.js');
    });

    it('prefers "browser" when resolution "target" is set to "browser" (also default)', () => {
      const fs = createMemoryFs({
        lodash: {
          'package.json': stringifyPackageJson({ main: 'entry.js', browser: './browser.js' }),
          'entry.js': EMPTY,
          'browser.js': EMPTY,
        },
      });
      const resolveRequest = createRequestResolver({ fs, target: 'browser' });

      expect(resolveRequest('/', './lodash')).to.be.resolvedTo('/lodash/browser.js');
    });

    it('resolves "browser" which points to a folder with an index file', () => {
      const fs = createMemoryFs({
        lodash: {
          browser: { 'index.js': EMPTY },
          'package.json': stringifyPackageJson({ main: 'entry.js', browser: './browser' }),
          'entry.js': EMPTY,
        },
        'another-package': {
          browser: {},
          'package.json': stringifyPackageJson({ browser: './browser' }),
        },
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', './lodash')).to.be.resolvedTo('/lodash/browser/index.js');
      expect(resolveRequest('/', './another-package')).to.be.resolvedTo(undefined);
    });
  });

  describe('browser field (object)', () => {
    it('supports remapping files within the same project', () => {
      const fs = createMemoryFs({
        'package.json': stringifyPackageJson({ browser: { './file': './file-browser' } }),
        'file.js': EMPTY,
        'file-browser.js': EMPTY,
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', './file')).to.be.resolvedTo('/file-browser.js');
    });

    it('supports remapping of package to package', () => {
      const fs = createMemoryFs({
        'package.json': stringifyPackageJson({ browser: { fs: 'browser-fs' } }),
        node_modules: {
          'browser-fs': {
            'package.json': stringifyPackageJson({ main: './file.js' }),
            'file.js': EMPTY,
          },
        },
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', 'fs')).to.be.resolvedTo('/node_modules/browser-fs/file.js');
    });

    it('supports remapping of package to false (empty object)', () => {
      const fs = createMemoryFs({
        'package.json': stringifyPackageJson({ browser: { fs: false } }),
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', 'fs')).to.be.resolvedTo(false);
    });

    it('supports remapping of a local file to false (empty object)', () => {
      const fs = createMemoryFs({
        'package.json': stringifyPackageJson({ browser: { './some-file.js': false } }),
        'some-file.js': EMPTY,
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', './some-file')).to.be.resolvedTo(false);
      expect(resolveRequest('/', './some-file').originalFilePath).to.equal('/some-file.js');
    });

    it('supports remapping of package to a relative file', () => {
      const fs = createMemoryFs({
        'package.json': stringifyPackageJson({ browser: { fs: './browser-fs' } }),
        'browser-fs.js': EMPTY,
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', 'fs')).to.be.resolvedTo('/browser-fs.js');
    });

    it('supports packages remapping their entrypoint', () => {
      const fs = createMemoryFs({
        node_modules: {
          'some-package': {
            'package.json': stringifyPackageJson({ main: './file.js', browser: { './file': './file-browser' } }),
            'file.js': EMPTY,
            'file-browser.js': EMPTY,
          },
        },
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', 'some-package')).to.be.resolvedTo('/node_modules/some-package/file-browser.js');
      expect(resolveRequest('/', 'some-package/file')).to.be.resolvedTo('/node_modules/some-package/file-browser.js');
      expect(resolveRequest('/node_modules/some-package', './file')).to.be.resolvedTo(
        '/node_modules/some-package/file-browser.js'
      );
    });

    it('ignores re-mapping when source/target are missing/invalid', () => {
      const fs = createMemoryFs({
        'package.json': stringifyPackageJson({
          browser: {
            './file': 123 as unknown as string,
            './missing-source': './missing-target',
            './another-missing': './file',
          },
        }),
        'file.js': EMPTY,
      });
      const resolveRequest = createRequestResolver({ fs });

      expect(resolveRequest('/', './file')).to.be.resolvedTo('/file.js');
      expect(resolveRequest('/', './missing-source')).to.be.resolvedTo(undefined);
      expect(resolveRequest('/', './another-missing')).to.be.resolvedTo(undefined);
    });
  });

  xdescribe('alias', () => {
    it('remaps absolute file path of existing files', () => {
      const fs = createMemoryFs({
        'x.js': EMPTY,
        'y.js': EMPTY,
        node_modules: {
          a: {
            'index.js': EMPTY,
          },
          b: {
            'index.js': EMPTY,
          },
        },
      });

      const resolveRequest = createRequestResolver({
        fs,
        alias: {
          '/x.js': '/y.js',
          '/node_modules/a/index.js': '/node_modules/b/index.js',
        },
      });

      expect(resolveRequest('/', './x')).to.be.resolvedTo('/y.js');
      expect(resolveRequest('/', 'a')).to.be.resolvedTo('/node_modules/b/index.js');
    });

    it('remaps package requests to other package requests', () => {
      const fs = createMemoryFs({
        node_modules: {
          a: {
            'index.js': EMPTY,
            'other.js': EMPTY,
          },
          b: {
            'index.js': EMPTY,
            'other.js': EMPTY,
          },
        },
      });

      const resolveRequest = createRequestResolver({
        fs,
        alias: {
          a: 'b',
          'a/other': 'b/other',
          'a/missing': 'a/index',
        },
      });

      expect(resolveRequest('/', 'a')).to.be.resolvedTo('/node_modules/b/index.js');
      expect(resolveRequest('/', 'a/other')).to.be.resolvedTo('/node_modules/b/other.js');
      expect(resolveRequest('/', 'a/other.js')).to.be.resolvedTo('/node_modules/a/other.js');
      expect(resolveRequest('/', 'a/missing')).to.be.resolvedTo('/node_modules/a/index.js');
    });
  });

  describe('Aliases', () => {
    const MODULE_REQUEST = 'xyz';
    const MODULE_INTERNAL = 'xyz/file.js';

    function generateFolderContent(): { 'index.js': ''; 'file.js': '' } {
      return { 'index.js': '', 'file.js': '' };
    }

    it('Should support alias matches', () => {
      const fs = createMemoryFs({
        abc: {
          node_modules: {
            xyz: generateFolderContent(),
            modu: {
              ...generateFolderContent(),
              some: generateFolderContent(),
              dir: generateFolderContent(),
            },
            grosso: {
              'unresolve.js': '',
              'file.js': '',
            },
          },
          path: {
            to: generateFolderContent(),
          },
          dir: generateFolderContent(),
        },
        some: {
          dir: generateFolderContent(),
        },
      });

      const emptyAliasResolver = createRequestResolver({ fs, alias: {} });
      expect(emptyAliasResolver('/abc', MODULE_REQUEST).resolvedFile).to.eql('/abc/node_modules/xyz/index.js');
      expect(emptyAliasResolver('/abc', MODULE_INTERNAL).resolvedFile).to.eql('/abc/node_modules/xyz/file.js');

      // File like absolute path
      const exactMatchToAbsoluteFilePathResolver = createRequestResolver({
        fs,
        alias: { xyz: '/abc/path/to/file.js' },
      });
      expect(exactMatchToAbsoluteFilePathResolver('/abc', MODULE_REQUEST).resolvedFile).to.eql('/abc/path/to/file.js');
      expect(exactMatchToAbsoluteFilePathResolver('/abc', MODULE_INTERNAL).resolvedFile).to.eql(
        '/abc/node_modules/xyz/file.js'
      );

      // Dir like absolute path
      const prefixMathToAbsoluteDirResolver = createRequestResolver({ fs, alias: { 'xyz/*': '/some/dir/*' } });
      expect(prefixMathToAbsoluteDirResolver('/abc', MODULE_REQUEST).resolvedFile).to.eql('/some/dir/index.js');
      expect(prefixMathToAbsoluteDirResolver('/abc', MODULE_INTERNAL).resolvedFile).to.eql('/some/dir/file.js');

      const exactMathToAbsoluteDirResolver = createRequestResolver({ fs, alias: { xyz: '/some/dir' } });
      expect(exactMathToAbsoluteDirResolver('/abc', MODULE_REQUEST).resolvedFile).to.eql('/some/dir/index.js');
      expect(exactMathToAbsoluteDirResolver('/abc', MODULE_INTERNAL).resolvedFile).to.eql(
        '/abc/node_modules/xyz/file.js'
      );

      // Alias to module
      const prefixMatchToModuleResolver = createRequestResolver({ fs, alias: { 'xyz/*': 'modu/*' } });
      expect(prefixMatchToModuleResolver('/abc', MODULE_REQUEST).resolvedFile).to.eql(
        '/abc/node_modules/modu/index.js'
      );
      expect(prefixMatchToModuleResolver('/abc', MODULE_INTERNAL).resolvedFile).to.eql(
        '/abc/node_modules/modu/file.js'
      );

      const exactMatchToModuleResolver = createRequestResolver({ fs, alias: { xyz: 'modu' } });
      expect(exactMatchToModuleResolver('/abc', MODULE_REQUEST).resolvedFile).to.eql('/abc/node_modules/modu/index.js');
      expect(exactMatchToModuleResolver('/abc', MODULE_INTERNAL).resolvedFile).to.eql('/abc/node_modules/xyz/file.js');

      // Alias to module internals
      const prefixMatchToModuleInternalResolver = createRequestResolver({ fs, alias: { 'xyz/*': 'modu/dir/*' } });
      expect(prefixMatchToModuleInternalResolver('/abc', MODULE_REQUEST).resolvedFile).to.eql(
        '/abc/node_modules/modu/dir/index.js'
      );
      expect(prefixMatchToModuleInternalResolver('/abc', MODULE_INTERNAL).resolvedFile).to.eql(
        '/abc/node_modules/modu/dir/file.js'
      );

      const exactPathToModuleInternalResolver = createRequestResolver({ fs, alias: { xyz: 'modu/dir' } });
      expect(exactPathToModuleInternalResolver('/abc', MODULE_REQUEST).resolvedFile).to.eql(
        '/abc/node_modules/modu/dir/index.js'
      );
      expect(exactPathToModuleInternalResolver('/abc', MODULE_INTERNAL).resolvedFile).to.eql(
        '/abc/node_modules/xyz/file.js'
      );

      //alias to false
      const prefixMatchToFalseResolver = createRequestResolver({ fs, alias: { 'xyz/*': false } });
      expect(prefixMatchToFalseResolver('/abc', MODULE_REQUEST).resolvedFile).to.eql(false);
      expect(prefixMatchToFalseResolver('/abc', MODULE_INTERNAL).resolvedFile).to.eql(false);

      const exactPathToFalseResolver = createRequestResolver({ fs, alias: { xyz: false } });
      expect(exactPathToFalseResolver('/abc', MODULE_REQUEST).resolvedFile).to.eql(false);
      expect(exactPathToFalseResolver('/abc', MODULE_INTERNAL).resolvedFile).to.eql('/abc/node_modules/xyz/file.js');

      // Array aliases
      const prefixMatchToArrayResolver = createRequestResolver({ fs, alias: { 'xyz/*': ['grosso/*', 'modu/*'] } });
      expect(prefixMatchToArrayResolver('/abc', MODULE_REQUEST).resolvedFile).to.eql('/abc/node_modules/modu/index.js');
      expect(prefixMatchToArrayResolver('/abc', MODULE_INTERNAL).resolvedFile).to.eql(
        '/abc/node_modules/grosso/file.js'
      );

      const prefixMatchToArrayVerifyOrderResolver = createRequestResolver({
        fs,
        alias: { 'xyz/*': ['modu/*', 'grosso/*'] },
      });
      expect(prefixMatchToArrayVerifyOrderResolver('/abc', MODULE_REQUEST).resolvedFile).to.eql(
        '/abc/node_modules/modu/index.js'
      );
      expect(prefixMatchToArrayVerifyOrderResolver('/abc', MODULE_INTERNAL).resolvedFile).to.eql(
        '/abc/node_modules/modu/file.js'
      );

      const exactMatchToArrayResolver = createRequestResolver({ fs, alias: { xyz: ['grosso', 'modu'] } });
      expect(exactMatchToArrayResolver('/abc', MODULE_REQUEST).resolvedFile).to.eql('/abc/node_modules/modu/index.js');
      expect(exactMatchToArrayResolver('/abc', MODULE_INTERNAL).resolvedFile).to.eql('/abc/node_modules/xyz/file.js');
    });

    it('should prefier alias, then original request, then fallback', () => {
      const fs = createMemoryFs({
        node_modules: {
          xyz: {
            'file.js': '',
          },
          abc: {
            'file.js': '',
          },
        },
        dir: {
          'file.js': '',
        },
      });

      // Prefer alias
      expect(
        createRequestResolver({ fs, alias: { 'xyz/*': '/dir/*' }, fallback: { 'xyz/*': 'abc/*' } })('/', 'xyz/file')
          .resolvedFile
      ).to.eq('/dir/file.js');
      // Without alias, prefer redular resolution
      expect(createRequestResolver({ fs })('/', 'xyz/file').resolvedFile).to.eq('/node_modules/xyz/file.js');
      // When resolving non-existing file go to fallback
      expect(
        // Alias point to nothing to get alias to fail
        createRequestResolver({ fs, alias: { 'pac/*': 'dir/*' }, fallback: { 'pac/*': 'abc/*' } })('/', 'pac/file')
          .resolvedFile
      ).to.eq('/node_modules/abc/file.js');
    });
  });
});
