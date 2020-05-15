const execa = require('execa')
const path = require('path')
const _ = require('ramda')

const splitBySpace = _.split(' ')

const joinBySpace = _.join(' ')

const getSubstringByLastIndexOf = (char) => (str) =>
  str.substr(str.lastIndexOf(char))

const getFileExtension = (str) => getSubstringByLastIndexOf('.')(str)

const getLastDirectory = (str) => str.substring(0, str.lastIndexOf('/'))

const onlyJSAndTS = _.filter(
  _.compose(
    (ext) => _.includes(ext, ['.js', '.ts', '.jsx', '.tsx']),
    getFileExtension
  )
)

const getJsAndTsFiles = _.compose(joinBySpace, onlyJSAndTS, splitBySpace)

// ================================================

function findAncestor(branchName, originBranch) {
  return execa
    .command(`git merge-base ${originBranch} ${branchName}`)
    .then(({ stdout, stderr }) => {
      if (stderr) {
        throw new Error(stderr)
      }
      return stdout.replace(/\n/g, ' ')
    })
}

function changedFiles(branchName, originBranch = 'remotes/origin/master') {
  return execa
    .command(`git diff --name-only ${branchName} ${originBranch}`)
    .then(({ stdout, stderr }) => {
      if (stderr) {
        throw new Error(stderr)
      }
      return getJsAndTsFiles(stdout.replace(/\n/g, ' '))
    })
}

function findRelatedTests(changedFiles) {
  return execa
    .command(
      `./node_modules/.bin/jest --listTests --findRelatedTests ${changedFiles}`
    )
    .then(({ stdout, stderr }) => {
      if (stderr) {
        throw new Error(stderr)
      }
      return {
        changedFiles: splitBySpace(changedFiles),
        relatedTests: splitBySpace(stdout.replace(/\n/g, ' ')),
      }
    })
    .catch((e) => console.error(e))
}

function collectCoverageFromChanges(changes) {
  const { changedFiles, relatedTests = [] } = changes || {}

  if (relatedTests.length < 1 || relatedTests[0] == '') {
    // wow, nothing to test!
    return
  }
  const collectCoverageFrom = _.compose(
    joinBySpace,
    _.map((changedFile) => `--collectCoverageFrom ${changedFile}`)
  )
  const testFiles = _.compose(
    joinBySpace,
    _.map((testFile) => path.relative(process.cwd(), testFile))
  )

  const coverageCommand = `jest ${collectCoverageFrom(
    changedFiles
  )} --coverage ${testFiles(relatedTests)}`
  console.log(coverageCommand)
  return execa.command(coverageCommand, { stdio: 'inherit' }).catch(() => {
    process.exitCode = 1
  })
}

function jestBranchCoverage(branchName, origin) {
  return findAncestor(branchName, origin)
    .then((ancestor) => changedFiles(branchName, ancestor))
    .then(findRelatedTests)
    .then(collectCoverageFromChanges)
}

module.exports = {
  changedFiles,
  findRelatedTests,
  collectCoverageFromChanges,
  jestBranchCoverage,
}
