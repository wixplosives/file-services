import chai, { expect } from 'chai';
import fs from '@file-services/node';
import { createMemoryFs } from '@file-services/memory';
import { createRequestResolver } from '@file-services/resolve';
import { resolutionMatchers } from './resolution-matchers.js';

chai.use(resolutionMatchers);

describe('request resolver node integration', () => {
  it('resolves symlinks to realpath', () => {
    const resolveRequest = createRequestResolver({ fs });
    const requestViaLink = '@file-services/resolve/package.json';

    expect(resolveRequest(__dirname, requestViaLink)).to.be.resolvedTo(require.resolve(requestViaLink));
  });

  it('returns symlink path if realpathSync throws', () => {
    const resolveRequest = createRequestResolver({
      fs: {
        ...fs,
        realpathSync: () => {
          throw new Error(`always throws`);
        },
      },
    });
    const requestViaLink = '@file-services/resolve/package.json';
    expect(resolveRequest(__dirname, requestViaLink).resolvedFile).to.include(fs.join('node_modules', requestViaLink));
  });
});

describe('alias support', () => {
  const MODULE_REQUEST = 'xyz';
  const MODULE_INTERNAL = 'xyz/file.js';

  function generateFolderContent(): { 'index.js': ''; 'file.js': '' } {
    return { 'index.js': '', 'file.js': '' };
  }

  const fs = createMemoryFs({
    abc: {
      node_modules: {
        xyz: generateFolderContent(),
        modu: {
          ...generateFolderContent(),
          some: generateFolderContent(),
          dir: generateFolderContent(),
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

  const aliasExpectationMapper: {
    alias: Record<string, string | false>;
    expectedModule: string | false | undefined;
    expectedInternal?: string | false | undefined;
  }[] = [
    // Cases as states in webpack docs https://webpack.js.org/configuration/resolve/#resolvealias
    { alias: {}, expectedModule: '/abc/node_modules/xyz/index.js', expectedInternal: '/abc/node_modules/xyz/file.js' },
    {
      alias: { xyz: '/abc/path/to/file.js' },
      expectedModule: '/abc/path/to/file.js',
    },
    {
      alias: { xyz$: '/abc/path/to/file.js' },
      expectedModule: '/abc/path/to/file.js',
      expectedInternal: '/abc/node_modules/xyz/file.js',
    },
    {
      alias: { xyz: './dir/file.js' },
      expectedModule: '/abc/dir/file.js',
    },
    {
      alias: { xyz$: './dir/file.js' },
      expectedModule: '/abc/dir/file.js',
      expectedInternal: '/abc/node_modules/xyz/file.js',
    },
    { alias: { xyz: '/some/dir' }, expectedModule: '/some/dir/index.js', expectedInternal: '/some/dir/file.js' },
    {
      alias: { xyz$: '/some/dir' },
      expectedModule: '/some/dir/index.js',
      expectedInternal: '/abc/node_modules/xyz/file.js',
    },
    {
      alias: { xyz: './dir' },
      expectedModule: '/abc/dir/index.js',
      expectedInternal: '/abc/dir/file.js',
    },
    {
      alias: { xyz: 'modu' },
      expectedModule: '/abc/node_modules/modu/index.js',
      expectedInternal: '/abc/node_modules/modu/file.js',
    },
    {
      alias: { xyz$: 'modu' },
      expectedModule: '/abc/node_modules/modu/index.js',
      expectedInternal: '/abc/node_modules/xyz/file.js',
    },
    {
      alias: { xyz: 'modu/some/file.js' },
      expectedModule: '/abc/node_modules/modu/some/file.js',
    },
    {
      alias: { xyz: 'modu/dir' },
      expectedModule: '/abc/node_modules/modu/dir/index.js',
      expectedInternal: '/abc/node_modules/modu/dir/file.js',
    },
    {
      alias: { xyz$: 'modu/dir' },
      expectedModule: '/abc/node_modules/modu/dir/index.js',
      expectedInternal: '/abc/node_modules/xyz/file.js',
    },
    // Additional cases
    {
      alias: { xyz: false },
      expectedModule: false,
      expectedInternal: false,
    },
  ];

  aliasExpectationMapper.forEach(({ alias, expectedModule, expectedInternal }) => {
    describe(JSON.stringify(alias), () => {
      const resolver = createRequestResolver({ fs, aliases: alias });
      it(`should return ${JSON.stringify(expectedModule)} for import '${MODULE_REQUEST}' `, () => {
        expect(resolver('/abc', MODULE_REQUEST).resolvedFile).to.eql(expectedModule);
      });
      if (expectedInternal !== undefined) {
        it(`should return ${JSON.stringify(expectedInternal)} for import '${MODULE_INTERNAL}`, () => {
          expect(resolver('/abc', MODULE_INTERNAL).resolvedFile).to.eql(expectedInternal);
        });
      } else {
        it(`should throw for import '${MODULE_INTERNAL}'`, () => {
          expect(() => {
            resolver('/abc', MODULE_INTERNAL);
          }).to.throw('Alias points to file');
        });
      }
    });
  });
});
