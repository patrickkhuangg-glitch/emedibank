const classes = new Proxy({}, {
  get(_target, property) {
    return typeof property === 'string' ? property : undefined
  },
})

export default classes
