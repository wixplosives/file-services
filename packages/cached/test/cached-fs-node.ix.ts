import { expect } from 'chai';
import { createNodeFs } from '@file-services/node';
import { createCachedFs } from '../src';

describe(`cachedFs with Node's fs`, () => {
  const filePath = '../../package.json';
  it('caches statsSync calls', async () => {
    const nodeFs = createNodeFs();

    const fs = createCachedFs(nodeFs);

    const stats = fs.statSync(filePath);
    const stats2 = fs.statSync(filePath);

    expect(stats).to.equal(stats2);
  });

  it('allows invalidating cache of file path', async () => {
    const nodeFs = createNodeFs();

    const fs = createCachedFs(nodeFs);

    const stats = fs.statSync(filePath);
    fs.invalidate(filePath);
    const stats2 = fs.statSync(filePath);

    expect(stats).to.not.equal(stats2);
  });

  it('allows invalidating cache of all file paths', async () => {
    const nodeFs = createNodeFs();

    const fs = createCachedFs(nodeFs);

    const stats = fs.statSync(filePath);
    fs.invalidateAll();
    const stats2 = fs.statSync(filePath);

    expect(stats).to.not.equal(stats2);
  });

  it('caches statsSync calls - through fileExists', async () => {
    const nodeFs = createNodeFs();

    const fs = createCachedFs(nodeFs);

    const exists = fs.fileExistsSync(filePath);
    const exists2 = fs.fileExistsSync(filePath);

    expect(exists).to.equal(exists2);
  });

  it('caches stats (callback-style) calls', async () => {
    const nodeFs = createNodeFs();

    const fs = createCachedFs(nodeFs);

    const stats = await new Promise((res, rej) =>
      fs.stat(filePath, (error, value) => (error ? rej(error) : res(value)))
    );

    const stats2 = await new Promise((res, rej) =>
      fs.stat(filePath, (error, value) => (error ? rej(error) : res(value)))
    );

    expect(stats).to.equal(stats2);
  });

  it('allows invalidating cache of file path (callback-style version)', async () => {
    const nodeFs = createNodeFs();

    const fs = createCachedFs(nodeFs);

    const stats = await new Promise((res, rej) =>
      fs.stat(filePath, (error, value) => (error ? rej(error) : res(value)))
    );

    fs.invalidate(filePath);

    const stats2 = await new Promise((res, rej) =>
      fs.stat(filePath, (error, value) => (error ? rej(error) : res(value)))
    );

    expect(stats).to.not.equal(stats2);
  });

  it('allows invalidating cache of all file paths (callback-style version)', async () => {
    const nodeFs = createNodeFs();

    const fs = createCachedFs(nodeFs);

    const stats = await new Promise((res, rej) =>
      fs.stat(filePath, (error, value) => (error ? rej(error) : res(value)))
    );

    fs.invalidateAll();

    const stats2 = await new Promise((res, rej) =>
      fs.stat(filePath, (error, value) => (error ? rej(error) : res(value)))
    );

    expect(stats).to.not.equal(stats2);
  });
});
