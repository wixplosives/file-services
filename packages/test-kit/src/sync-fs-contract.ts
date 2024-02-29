import { expect } from "chai";
import type { IFileSystemSync } from "@file-services/types";
import type { ITestInput } from "./types";

const SAMPLE_CONTENT = "content";

export function syncFsContract(testProvider: () => Promise<ITestInput<IFileSystemSync>>): void {
  describe("SYNC file system contract", () => {
    let testInput: ITestInput<IFileSystemSync>;

    beforeEach(async () => (testInput = await testProvider()));
    afterEach(async () => await testInput.dispose());

    describe("fileExistsSync", () => {
      it("returns true if path points to a file", () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, "file");

        fs.writeFileSync(filePath, SAMPLE_CONTENT);

        expect(fs.fileExistsSync(filePath)).to.equal(true);
      });

      it("returns false if path does not exist", () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, "non-existing-file");

        expect(fs.fileExistsSync(filePath)).to.equal(false);
      });

      it("returns false if path points to a directory", () => {
        const { fs, tempDirectoryPath } = testInput;

        const directoryPath = fs.join(tempDirectoryPath, "dir");

        fs.mkdirSync(directoryPath);

        expect(fs.fileExistsSync(directoryPath)).to.equal(false);
      });

      it("returns false if parent path points to a file", () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, "file");

        fs.writeFileSync(filePath, SAMPLE_CONTENT);

        expect(fs.fileExistsSync(fs.join(filePath, "file-within-file"))).to.equal(false);
      });

      it("returns false even if parent path does not exist", () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, "missing-parent", "non-existing-file");

        expect(fs.fileExistsSync(filePath)).to.equal(false);
      });
    });

    describe("directoryExistsSync", () => {
      it("returns true if path points to a directory", () => {
        const { fs, tempDirectoryPath } = testInput;

        const directoryPath = fs.join(tempDirectoryPath, "dir");

        fs.mkdirSync(directoryPath);

        expect(fs.directoryExistsSync(directoryPath)).to.equal(true);
      });

      it("returns false if path does not exist", () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, "non-existing-directory");

        expect(fs.directoryExistsSync(filePath)).to.equal(false);
      });

      it("returns false if path points to a file", () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, "file");

        fs.writeFileSync(filePath, SAMPLE_CONTENT);

        expect(fs.directoryExistsSync(filePath)).to.equal(false);
      });

      it("returns false if parent path points to a file", () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, "file");

        fs.writeFileSync(filePath, SAMPLE_CONTENT);

        expect(fs.directoryExistsSync(fs.join(filePath, "dir-within-file"))).to.equal(false);
      });

      it("returns false if parent path does not exist", () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, "missing-parent", "non-existing-directory");

        expect(fs.directoryExistsSync(filePath)).to.equal(false);
      });
    });

    describe("readJsonFileSync", () => {
      it("parses contents of a json file and returns it", () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, "file.json");
        const jsonValue = { name: "test", age: 99 };

        fs.writeFileSync(filePath, JSON.stringify(jsonValue));

        expect(fs.readJsonFileSync(filePath)).to.eql(jsonValue);
      });

      it("throws on file reading errors", () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, "file.json");

        expect(() => fs.readJsonFileSync(filePath)).to.throw(/ENOENT/);
      });

      it("throws on JSON parse errors", () => {
        const { fs, tempDirectoryPath } = testInput;

        const filePath = fs.join(tempDirectoryPath, "file.json");

        fs.writeFileSync(filePath, `#NON-JSON#`);

        expect(() => fs.readJsonFileSync(filePath)).to.throw(/Unexpected token/);
      });
    });

    const fileName = "a.json";
    const anotherFileName = "b.json";

    describe("findFilesSync", () => {
      it("finds all files recursively inside a directory", () => {
        const { fs, tempDirectoryPath } = testInput;
        const directoryPath = fs.join(tempDirectoryPath, "dir");

        fs.populateDirectorySync(directoryPath, {
          [fileName]: "",
          folder1: {
            [fileName]: "",
          },
          folder2: {
            [anotherFileName]: "",
          },
        });

        expect(fs.findFilesSync(directoryPath)).to.eql([
          fs.join(directoryPath, fileName),
          fs.join(directoryPath, "folder1", fileName),
          fs.join(directoryPath, "folder2", anotherFileName),
        ]);

        expect(fs.findFilesSync(fs.join(directoryPath, "folder1"))).to.eql([
          fs.join(directoryPath, "folder1", fileName),
        ]);
      });

      it("allows specifying a file filtering callback", () => {
        const { fs, tempDirectoryPath } = testInput;
        const directoryPath = fs.join(tempDirectoryPath, "dir");

        fs.populateDirectorySync(directoryPath, {
          [fileName]: "",
          folder1: {
            [fileName]: "",
          },
          folder2: {
            [anotherFileName]: "",
          },
        });

        expect(fs.findFilesSync(directoryPath, { filterFile: ({ name }) => name === fileName })).to.eql([
          fs.join(directoryPath, fileName),
          fs.join(directoryPath, "folder1", fileName),
        ]);

        expect(fs.findFilesSync(directoryPath, { filterFile: ({ name }) => name === anotherFileName })).to.eql([
          fs.join(directoryPath, "folder2", anotherFileName),
        ]);
      });

      it("allows specifying a directory filtering callback", () => {
        const { fs, tempDirectoryPath } = testInput;
        const directoryPath = fs.join(tempDirectoryPath, "dir");

        fs.populateDirectorySync(directoryPath, {
          [fileName]: "",
          folder1: {
            [fileName]: "",
          },
          folder2: {
            [anotherFileName]: "",
          },
        });

        expect(fs.findFilesSync(directoryPath, { filterDirectory: ({ name }) => name === "folder1" })).to.eql([
          fs.join(directoryPath, fileName),
          fs.join(directoryPath, "folder1", fileName),
        ]);

        expect(fs.findFilesSync(directoryPath, { filterDirectory: ({ name }) => name === "folder2" })).to.eql([
          fs.join(directoryPath, fileName),
          fs.join(directoryPath, "folder2", anotherFileName),
        ]);
      });

      it("respects includeSymbolicLinks option", () => {
        const { fs, tempDirectoryPath } = testInput;
        const directoryPath = fs.join(tempDirectoryPath, "dir");

        fs.populateDirectorySync(directoryPath, {
          [fileName]: "",
          folder1: {},
          folder2: {},
          ignoredFolder1: {},
        });

        // /folder1/link => /fileName
        fs.symlinkSync(fs.join(directoryPath, fileName), fs.join(directoryPath, "folder1", "link"), "junction");
        // /folder2/ignored-link => /fileName
        fs.symlinkSync(fs.join(directoryPath, fileName), fs.join(directoryPath, "folder2", "ignored-link"), "junction");
        // /ignoredFolder1/link => /fileName
        fs.symlinkSync(fs.join(directoryPath, fileName), fs.join(directoryPath, "ignoredFolder1", "link"), "junction");
        // /folder3 => /folder1
        fs.symlinkSync(fs.join(directoryPath, "folder1"), fs.join(directoryPath, "folder3"), "junction");
        // /ignoredFolder2 => /folder1
        fs.symlinkSync(fs.join(directoryPath, "folder1"), fs.join(directoryPath, "ignoredFolder2"), "junction");

        expect(fs.findFilesSync(directoryPath)).to.eql([fs.join(directoryPath, fileName)]);

        expect(
          fs.findFilesSync(directoryPath, {
            includeSymbolicLinks: true,
            filterFile: (desc) => desc.name !== "ignored-link",
            filterDirectory: (desc) => desc.name !== "ignoredFolder1" && desc.name !== "ignoredFolder2",
          }),
        ).to.eql([
          fs.join(directoryPath, fileName),
          fs.join(directoryPath, "folder1", "link"),
          fs.join(directoryPath, "folder3", "link"),
        ]);
      });
    });

    describe("findClosestFileSync", () => {
      it("finds closest file in parent directory chain", () => {
        const { fs, tempDirectoryPath } = testInput;
        const directoryPath = fs.join(tempDirectoryPath, "dir");

        fs.populateDirectorySync(directoryPath, {
          [fileName]: "",
          folder1: {
            [fileName]: "",
          },
          folder2: {
            [anotherFileName]: "",
          },
        });

        expect(fs.findClosestFileSync(fs.join(directoryPath, "folder1"), fileName)).to.equal(
          fs.join(directoryPath, "folder1", fileName),
        );

        expect(fs.findClosestFileSync(directoryPath, fileName)).to.equal(fs.join(directoryPath, fileName));

        expect(fs.findClosestFileSync(fs.join(directoryPath, "folder2"), anotherFileName)).to.equal(
          fs.join(directoryPath, "folder2", anotherFileName),
        );

        expect(fs.findClosestFileSync(directoryPath, anotherFileName)).to.equal(undefined);
      });
    });

    describe("findFilesInAncestorsSync", () => {
      it("finds files in parent directory chain", () => {
        const { fs, tempDirectoryPath } = testInput;
        const directoryPath = fs.join(tempDirectoryPath, "dir");

        fs.populateDirectorySync(directoryPath, {
          [fileName]: "",
          folder1: {
            [fileName]: "",
          },
          folder2: {
            [anotherFileName]: "",
          },
        });

        expect(fs.findFilesInAncestorsSync(fs.join(directoryPath, "folder1"), fileName)).to.eql([
          fs.join(directoryPath, "folder1", fileName),
          fs.join(directoryPath, fileName),
        ]);

        expect(fs.findFilesInAncestorsSync(fs.join(directoryPath, "folder2"), anotherFileName)).to.eql([
          fs.join(directoryPath, "folder2", anotherFileName),
        ]);
      });
    });

    describe("copyDirectorySync", () => {
      it("copies a directory and its children", () => {
        const { fs, tempDirectoryPath } = testInput;
        const sourcePath = fs.join(tempDirectoryPath, "src");
        const destinationPath = fs.join(tempDirectoryPath, "dist");

        fs.populateDirectorySync(sourcePath, {
          [fileName]: "file in root",
          folder1: {
            [fileName]: "file in sub-folder",
          },
          folder2: {
            folder3: {
              [anotherFileName]: "file in deep folder",
            },
          },
          empty: {
            inside: {},
          },
        });

        fs.copyDirectorySync(sourcePath, destinationPath);

        expect(fs.readFileSync(fs.join(destinationPath, fileName), "utf8")).to.eql("file in root");
        expect(fs.readFileSync(fs.join(destinationPath, "folder1", fileName), "utf8")).to.eql("file in sub-folder");
        expect(fs.readFileSync(fs.join(destinationPath, "folder2/folder3", anotherFileName), "utf8")).to.eql(
          "file in deep folder",
        );
        expect(fs.directoryExistsSync(fs.join(destinationPath, "empty/inside"))).to.eql(true);
      });
    });

    describe("ensureDirectorySync", () => {
      it(`creates intermediate directories`, () => {
        const { fs, tempDirectoryPath } = testInput;
        const directoryPath = fs.join(tempDirectoryPath, "animals", "mammals", "chiroptera");

        fs.ensureDirectorySync(directoryPath);

        expect(fs.directoryExistsSync(directoryPath)).to.equal(true);
      });

      it(`succeeds if directory already exists`, () => {
        const { fs, tempDirectoryPath } = testInput;
        const directoryPath = fs.join(tempDirectoryPath, "some-directory");
        fs.mkdirSync(directoryPath);

        expect(() => fs.ensureDirectorySync(directoryPath)).to.not.throw();
      });

      it(`throws when target points to an existing file`, () => {
        const { fs, tempDirectoryPath } = testInput;
        const filePath = fs.join(tempDirectoryPath, "bat.txt");
        fs.writeFileSync(filePath, "🦇");

        expect(() => fs.ensureDirectorySync(filePath)).to.throw("EEXIST");
      });

      it(`throws when attempting to create a directory inside of a file`, () => {
        const { fs, tempDirectoryPath } = testInput;
        const filePath = fs.join(tempDirectoryPath, "bat.txt");
        fs.writeFileSync(filePath, "🦇");

        const directoryPath = fs.join(filePath, "some-directory");
        expect(() => fs.ensureDirectorySync(directoryPath)).to.throw(/ENOTDIR|EEXIST/);
      });

      it("handles special paths gracefully", () => {
        const { fs, tempDirectoryPath } = testInput;
        const directoryPath = fs.join(tempDirectoryPath, "some-directory");
        fs.mkdirSync(directoryPath);

        const originalCwd = fs.cwd();
        try {
          fs.chdir(directoryPath); // ensure relative paths below are resolved in relation to directoryPath

          expect(() => fs.ensureDirectorySync(".")).to.not.throw();
          expect(() => fs.ensureDirectorySync("..")).to.not.throw();
        } finally {
          fs.chdir(originalCwd);
        }
      });
    });
  });
}
