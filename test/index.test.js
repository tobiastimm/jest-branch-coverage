const execa = require('execa')
const process = require('process')
const {
  changedFiles,
  findRelatedTests,
  collectCoverageFromChanges,
} = require('../lib')

describe('branch-coverage', () => {
  beforeEach(jest.restoreAllMocks)

  describe('changedFiles', () => {
    it('should be defined', () => {
      expect(changedFiles).toBeDefined()
    })

    it('should return an array of changes', async () => {
      const commandSpy = jest
        .spyOn(execa, 'command')
        .mockImplementationOnce(() => {
          return Promise.resolve({ stdout: 'feature/a.js\nfeature/b.js' })
        })

      const mockBranchName = 'feature/example'
      const mockOrigin = 'master'

      const result = await changedFiles(mockBranchName, mockOrigin)
        .run()
        .promise()
      expect(result).toEqual(['feature/a.js', 'feature/b.js'])
      expect(commandSpy).toHaveBeenCalledWith(
        `git diff --name-only ${mockBranchName} ${mockOrigin}`
      )
    })

    it('should return an empty list, if nothing changed', async () => {
      const commandSpy = jest
        .spyOn(execa, 'command')
        .mockImplementationOnce(() => {
          return Promise.resolve({ stdout: '' })
        })

      const mockBranchName = 'feature/example'
      const mockOrigin = 'master'

      const result = await changedFiles(mockBranchName, mockOrigin)
        .run()
        .promise()
      expect(result).toEqual([])
      expect(commandSpy).toHaveBeenCalledWith(
        `git diff --name-only ${mockBranchName} ${mockOrigin}`
      )
    })

    it('should fail with an error, if something goes wrong', async () => {
      const commandSpy = jest
        .spyOn(execa, 'command')
        .mockImplementationOnce(() => {
          return Promise.reject({ message: 'Failed!' })
        })
      const mockBranchName = 'feature/example'
      const mockOrigin = 'master'

      try {
        await changedFiles(mockBranchName, mockOrigin).run().promise()
        expect(commandSpy).toHaveBeenCalledWith(
          `git diff --name-only ${mockBranchName} ${mockOrigin}`
        )
      } catch (error) {
        expect(error).toEqual({ message: 'Failed!' })
      }
    })
  })

  describe('findRelatedTests', () => {
    it('should be defined', () => {
      expect(findRelatedTests).toBeDefined()
    })

    it('should list the related tests', async () => {
      const jestCommandSpy = jest
        .spyOn(execa, 'command')
        .mockImplementationOnce(() => {
          return Promise.resolve({
            stdout:
              '/Users/jest-branch-coverage/workspace/branch-test-coverage/test/index.test.js',
          })
        })

      const mockChangedFiles = ['lib/index.js']
      const result = await findRelatedTests(mockChangedFiles).run().promise()
      expect(result).toEqual({
        changedFiles: mockChangedFiles,
        relatedTests: [
          '/Users/jest-branch-coverage/workspace/branch-test-coverage/test/index.test.js',
        ],
      })
      expect(jestCommandSpy).toHaveBeenCalledWith(
        `jest --listTests --findRelatedTests ${mockChangedFiles.join(' ')}`
      )
    })
  })

  describe('collectCoverageFromChanges', () => {
    it('should be defined', () => {
      expect(collectCoverageFromChanges).toBeDefined()
    })

    it('should return the coverage', async () => {
      const jestCommandSpy = jest
        .spyOn(execa, 'command')
        .mockImplementationOnce(() => {
          return Promise.resolve({
            stdout: '',
          })
        })
      const processSpy = jest
        .spyOn(process, 'cwd')
        .mockImplementation(
          () => '/Users/jest-branch-coverage/workspace/branch-test-coverage/'
        )
      const mockChanges = {
        changedFiles: ['lib/index.js'],
        relatedTests: [
          '/Users/jest-branch-coverage/workspace/branch-test-coverage/test/index.test.js',
          '/Users/jest-branch-coverage/workspace/branch-test-coverage/test/bla.test.js',
        ],
      }
      const result = await collectCoverageFromChanges(mockChanges)
        .run()
        .promise()
      expect(result).toEqual('')
      expect(processSpy).toHaveBeenCalled()
      expect(jestCommandSpy).toHaveBeenCalledWith(
        'jest --collectCoverageFrom lib/index.js --coverage test/index.test.js test/bla.test.js'
      )
    })
  })
})
