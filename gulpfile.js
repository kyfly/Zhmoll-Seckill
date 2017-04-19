const gulp = require('gulp');
// const minifycss = require('gulp-clean-css');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const del = require('del');

// gulp.task('cleancss', function () {
//   return gulp
//     .src('public/css/login.css')
//     .pipe(gulp.dest('destPublic/css/login.css'))
//     .pipe(minifycss());
// });

gulp.task('minifyjs', function () {
  return gulp
    .src('public/js/*.js')
    //.pipe(concat('main.js'))    //合并所有js到main.js
    //.pipe(gulp.dest('destPublic/js/app.js'))    //输出main.js到文件夹
    .pipe(rename({ suffix: '.min' }))   //rename压缩后的文件名
    .pipe(uglify())    //压缩
    .pipe(gulp.dest('destPublic/js'));  //输出
});

gulp.task('downcount', function () {
  return gulp
    .src('public/lib/*.js')
    //.pipe(concat('main.js'))    //合并所有js到main.js
    //.pipe(gulp.dest('destPublic/js/app.js'))    //输出main.js到文件夹
    .pipe(rename({ suffix: '.min' }))   //rename压缩后的文件名
    .pipe(uglify())    //压缩
    .pipe(gulp.dest('destPublic/js'));  //输出
});