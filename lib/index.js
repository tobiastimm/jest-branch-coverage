const execa = require('execa')
const path = require('path')
const _ = require('ramda')
const { task, rejected } = require('folktale/concurrency/task')
const Maybe = require('folktale/maybe')

// ===================== PURE ===========================

const replaceNewLinesWithSpace = _.replace(/\n/g, ' ')

const splitBySpace = _.split(' ')

const joinBySpace = _.join(' ')

const safeHead = (arr) =>
  arr.length > 0 ? Maybe.Just(_.head(arr)) : Maybe.Nothing()

const getSubstringByLastIndexOf = (char) => (str) =>
  str.substr(str.lastIndexOf(char))

const getFileExtension = (str) => getSubstringByLastIndexOf('.')(str)

const onlyJSAndTS = _.filter(
  _.compose(
    (ext) => _.includes(ext, ['.js', '.ts', '.jsx', '.tsx']),
    getFileExtension
  )
)

const getJsAndTsFiles = _.compose(onlyJSAndTS, splitBySpace)

const execCommand = (command) =>
  task((resolver) =>
    execa
      .command(command)
      .then(({ stdout }) => resolver.resolve(stdout))
      .catch((error) => resolver.reject(error))
  )

const findAncestor = (branchName, originBranch) =>
  execCommand(`git merge-base ${originBranch} ${branchName}`).map(
    replaceNewLinesWithSpace
  )

const changedFiles = (branchName, originBranch = 'remotes/origin/master') =>
  execCommand(`git diff --name-only ${branchName} ${originBranch}`)
    .map(replaceNewLinesWithSpace)
    .map(getJsAndTsFiles)

const findRelatedTests = (changedFiles) =>
  execCommand(
    `jest --listTests --findRelatedTests ${joinBySpace(changedFiles)}`
  )
    .map(replaceNewLinesWithSpace)
    .map((output) => ({
      changedFiles,
      relatedTests: splitBySpace(output),
    }))

const writeCollectCoverageFrom = _.compose(
  joinBySpace,
  _.map((file) => `--collectCoverageFrom ${file}`)
)

const joinTestFilesPathsBySpace = _.compose(
  joinBySpace,
  _.map((testFile) => path.relative(process.cwd(), testFile))
)

const collectCoverageFromChanges = ({ changedFiles, relatedTests }) => {
  return safeHead(relatedTests)
    .chain((head) =>
      !_.isEmpty(head) ? Maybe.Just(relatedTests) : Maybe.Nothing()
    )
    .matchWith({
      Just: ({ value: testFiles }) =>
        execCommand(
          `jest ${writeCollectCoverageFrom(
            changedFiles
          )} --coverage ${joinTestFilesPathsBySpace(testFiles)}`
        ),
      Nothing: () => {
        return rejected('No tests to run!')
      },
    })
}

// ===================== IMPURE ===========================
/**

  function collectCoverageFromChanges(changes) {
    const { changedFiles, relatedTests = [] } = changes || {}

    if (relatedTests.length < 1 || relatedTests[0] == '') {
      // wow, nothing to test!
      return
    }

    const coverageCommand = ``
    return execa.command(coverageCommand, { stdio: 'inherit' }).catch(() => {
      process.exitCode = 1
    })
  }
*/

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
