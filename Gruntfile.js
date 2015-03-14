module.exports = function(grunt) {
  // Project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      options: {
        maxcomplexity: 30,
        expr: true,
        loopfunc: true,
        quotmark: 'single',
        node: true
      },
      files: [
        '*.js',
        'lib/**/*.js',
        'test/**/*.js'
      ]
    },

    jscs: {
      options: {
        force: true,
        disallowTrailingWhitespace: true,
        requireSpaceAfterLineComment: true,
        disallowFunctionDeclarations: true,
        disallowMultipleVarDecl: true,
        disallowMixedSpacesAndTabs: true,
        disallowNewlineBeforeBlockStatements: true,
        disallowKeywordsOnNewLine: ['else'],
        validateIndentation: 2
      },
      files: { src: [
        '*.js',
        'lib/**/*.js',
        'test/**/*.js'
      ]}
    },

  });

  // Get proxy grunt option
  var proxy = '';
  if(grunt.option('proxy') === true) {
    proxy = '_proxy';
  } else {
    proxy = '';
  }

  // Get smoke grunt option
  var smoke = '';
  if(grunt.option('smoke') === true) {
    smoke = '_smoke';
  } else {
    smoke = '';
  }
  // console.log(grunt.option.flags());

  // Load plugin(s)
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jscs');

  // Add task(s)
  grunt.registerTask('default', ['jscs', 'jshint']);
};

