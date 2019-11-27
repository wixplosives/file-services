import chai, { expect } from 'chai';
import { createMemoryFs } from '@file-services/memory';
import { createRequestResolver } from '../src';
import { resolutionMatchers } from './resolution-matchers';

const { stringify } = JSON;
chai.use(resolutionMatchers);

const EMPTY = '';

describe('request resolver', () => {
    describe('files', () => {
        it('resolves requests to any file if extension is specified', () => {
            const fs = createMemoryFs({
                src: {
                    'typed.ts': EMPTY,
                    'file.js': EMPTY,
                    'data.json': EMPTY
                },
                'style.css': EMPTY,
                'image.jpg': EMPTY
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
                    'style.css.js': EMPTY
                },
                'data.json': EMPTY
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
                    'same_name.ts': EMPTY
                },
                'file.ts': EMPTY,
                'another.tsx': EMPTY,
                'style.css.ts': EMPTY,
                'now_ignored.js': EMPTY
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
                        'file.js': EMPTY
                    }
                },
                folder: {
                    'file.js': EMPTY
                }
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
                    'file.js': EMPTY
                },
                'another.js': EMPTY
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
                '.js': EMPTY
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
                    'index.js': EMPTY
                },
                data: {
                    'index.json': EMPTY
                },
                typed: {
                    'index.ts': EMPTY
                }
            });
            const resolveRequest = createRequestResolver({ fs, extensions: ['.ts', '.js', '.json'] });

            expect(resolveRequest('/', './src')).to.be.resolvedTo('/src/index.js');
            expect(resolveRequest('/', './data')).to.be.resolvedTo('/data/index.json');
            expect(resolveRequest('/', './typed')).to.be.resolvedTo('/typed/index.ts');
        });

        it('resolves requests to a folder if it contains a package.json with a main', () => {
            const fs = createMemoryFs({
                with_ext: {
                    'package.json': stringify({ main: 'entry.js' }),
                    'entry.js': EMPTY
                },
                without_ext: {
                    'package.json': stringify({ main: 'main_file' }),
                    'main_file.js': EMPTY
                },
                to_inner_folder: {
                    inner: { 'index.js': EMPTY },
                    'package.json': stringify({ main: 'inner' })
                },
                to_file_in_folder: {
                    inner: { 'file.js': EMPTY },
                    'package.json': stringify({ main: 'inner/file.js' })
                },
                preferred: {
                    'package.json': stringify({ main: 'preferred.js' }),
                    'preferred.js': 'will be picked over index',
                    'index.js': EMPTY
                },
                dot_main: {
                    'package.json': stringify({ main: '.' }),
                    'index.js': EMPTY
                },
                empty_main: {
                    'package.json': stringify({ main: '' }),
                    'index.js': EMPTY
                },
                invalid_json: {
                    'package.json': '#invalid json#',
                    'index.js': EMPTY
                },
                invalid_json_no_index: {
                    'package.json': '#invalid json#'
                },
                no_main: {
                    'package.json': stringify({}),
                    'index.js': EMPTY
                }
            });
            const resolveRequest = createRequestResolver({ fs });

            expect(resolveRequest('/', './with_ext')).to.be.resolvedTo('/with_ext/entry.js');
            expect(resolveRequest('/', './without_ext')).to.be.resolvedTo('/without_ext/main_file.js');
            expect(resolveRequest('/', './to_file_in_folder')).to.be.resolvedTo('/to_file_in_folder/inner/file.js');
            expect(resolveRequest('/', './to_inner_folder')).to.be.resolvedTo('/to_inner_folder/inner/index.js');
            expect(resolveRequest('/', './preferred')).to.be.resolvedTo('/preferred/preferred.js');
            expect(resolveRequest('/', './dot_main')).to.be.resolvedTo('/dot_main/index.js');
            expect(resolveRequest('/', './empty_main')).to.be.resolvedTo('/empty_main/index.js');
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
                        'package.json': stringify({ main: 'main.js' }),
                        'main.js': EMPTY,
                        'another_entry.js': EMPTY
                    },
                    lodash: {
                        'package.json': stringify({ main: 'some-index' }),
                        'some-index.js': EMPTY,
                        'test-utils': {
                            'index.js': EMPTY,
                            'util1.js': EMPTY
                        }
                    },
                    'just-a-file.js': EMPTY
                }
            });
            const resolveRequest = createRequestResolver({ fs });

            expect(resolveRequest('/', 'express')).to.be.resolvedTo('/node_modules/express/main.js');

            // alternative entry point
            expect(resolveRequest('/', 'express/another_entry')).to.be.resolvedTo(
                '/node_modules/express/another_entry.js'
            );

            expect(resolveRequest('/', 'lodash')).to.be.resolvedTo('/node_modules/lodash/some-index.js');

            // sub-folder of a package
            expect(resolveRequest('/', 'lodash/test-utils')).to.be.resolvedTo(
                '/node_modules/lodash/test-utils/index.js'
            );

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
                                'package.json': stringify({ main: 'v1.js' }),
                                'v1.js': EMPTY
                            }
                        },
                        'package.json': stringify({ main: 'main.js' }),
                        'main.js': EMPTY
                    },
                    lodash: {
                        'package.json': stringify({ main: 'v2.js' }),
                        'v2.js': EMPTY,
                        'v2-specific-file.js': EMPTY
                    }
                }
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
                            'test-utils.js': EMPTY
                        }
                    }
                }
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
                            'package.json': stringify({ main: 'main-index' }),
                            'main-index.js': EMPTY
                        }
                    }
                },
                root_libs: {
                    react: {
                        'index.js': EMPTY
                    }
                }
            });
            const resolveRequest = createRequestResolver({ fs, packageRoots: ['third_party', '/root_libs'] });

            expect(resolveRequest('/project', 'koa')).to.be.resolvedTo('/project/third_party/koa/main-index.js');

            expect(resolveRequest('/project', 'react')).to.be.resolvedTo('/root_libs/react/index.js');
        });
    });

    describe('browser field', () => {
        it('prefers "browser" over "main" when loading a package.json', () => {
            const fs = createMemoryFs({
                lodash: {
                    'package.json': stringify({ main: 'entry.js', browser: './browser.js' }),
                    'entry.js': EMPTY,
                    'browser.js': EMPTY
                }
            });
            const resolveRequest = createRequestResolver({ fs });

            expect(resolveRequest('/', './lodash')).to.be.resolvedTo('/lodash/browser.js');
        });

        it('uses "browser" if "main" was not defined', () => {
            const fs = createMemoryFs({
                lodash: {
                    'package.json': stringify({ browser: 'file.js' }),
                    'file.js': EMPTY
                }
            });
            const resolveRequest = createRequestResolver({ fs });

            expect(resolveRequest('/', './lodash')).to.be.resolvedTo('/lodash/file.js');
        });

        it('prefers "main" when resolution "target" is set to "node"', () => {
            const fs = createMemoryFs({
                lodash: {
                    'package.json': stringify({ main: 'entry.js', browser: './browser.js' }),
                    'entry.js': EMPTY,
                    'browser.js': EMPTY
                }
            });
            const resolveRequest = createRequestResolver({ fs, target: 'node' });

            expect(resolveRequest('/', './lodash')).to.be.resolvedTo('/lodash/entry.js');
        });

        it('prefers "browser" when resolution "target" is set to "browser" (also default)', () => {
            const fs = createMemoryFs({
                lodash: {
                    'package.json': stringify({ main: 'entry.js', browser: './browser.js' }),
                    'entry.js': EMPTY,
                    'browser.js': EMPTY
                }
            });
            const resolveRequest = createRequestResolver({ fs, target: 'browser' });

            expect(resolveRequest('/', './lodash')).to.be.resolvedTo('/lodash/browser.js');
        });
    });
});
