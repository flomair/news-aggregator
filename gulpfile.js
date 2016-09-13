'use strict';
const browser = require('browser-sync');
const gulp = require('gulp');
const rimraf = require('rimraf');

const PORT = 8000,
dist = "dist",
src =  "src/**/*";



gulp.task('build', gulp.series(clean,copy));

gulp.task('default',
  gulp.series('build', server, watch));

function clean(done) {
  rimraf(dist, done);
}

function copy() {
  return gulp.src(src)
    .pipe(gulp.dest(dist));
}

function server(done) {
  browser.init({
    server: dist, port: PORT
  });
  done();
}

function reload(done) {
  browser.reload();
  done();
}

function watch() {
  gulp.watch(src).on('all', gulp.series(copy, browser.reload));
}
