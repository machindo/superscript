export default {
  cache: true,
  files: ['src/**/*.spec.ts'],
  sources: ['src/**/*.ts'],
  compileEnhancements: false,
  extensions: ['ts'],
  require: ['./src/test/register']
}
