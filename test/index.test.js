const {
  changedFiles,
  findRelatedTests,
  collectCoverageFromChanges,
} = require('../lib')

describe('branch-coverage', () => {
  describe('changedFiles', () => {
    it('should be defined', () => {
      expect(changedFiles).toBeDefined()
    })

    it('should print the changed files', async () => {
      const result = await changedFiles('feature/example', 'master')
      expect(result).toEqual(['example/example.js', 'example/example.ts'])
    })
  })

  describe('findRelatedTests', () => {
    it('should be defined', () => {
      expect(findRelatedTests).toBeDefined()
    })

    it('should list the related tests', async () => {
      const result = await findRelatedTests('lib/index.js')
      expect(result).toEqual({
        changedFiles: ['lib/index.js'],
        relatedTests: [
          '/Users/jest-branch-coverage/workspace/branch-test-coverage/test/index.test.js',
          '/Users/jest-branch-coverage/workspace/branch-test-coverage/test/bla.test.js',
        ],
      })
    })
  })

  describe('collectCoverageFromChanges', () => {
    it('should be defined', () => {
      expect(collectCoverageFromChanges).toBeDefined()
    })

    it('should return the coverage', () => {
      const mockChanges = {
        changedFiles: ['lib/index.js'],
        relatedTests: [
          '/Users/jest-branch-coverage/workspace/branch-test-coverage/test/index.test.js',
          '/Users/jest-branch-coverage/workspace/branch-test-coverage/test/bla.test.js',
        ],
      }
      expect(collectCoverageFromChanges(mockChanges)).toEqual()
    })
  })
})
