function assertNotAnonymous (name) {
  if (name === 'anonymous' || name === '') {
    throw new Error('Anonymous function is not allowed. Please specify a name')
  }
}

module.exports = { assertNotAnonymous }
