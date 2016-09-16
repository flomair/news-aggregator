/**
 *
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var APP = APP || {};
APP.Data = (function() {

  var HN_API_BASE = 'https://hacker-news.firebaseio.com';
  var HN_TOPSTORIES_URL = HN_API_BASE + '/v0/topstories.json';
  var HN_STORYDETAILS_URL = HN_API_BASE + '/v0/item/[ID].json';

  function getTopStories(callback) {
    request(HN_TOPSTORIES_URL, function(evt) {
      callback(evt.target.response);
    });
  }

  function getStoryById(id, callback) {

    var storyURL = HN_STORYDETAILS_URL.replace(/\[ID\]/, id);

    request(storyURL, function(evt) {
      callback(evt.target.response);
    });
  }

  function getStoryComment(id, callback) {

    var storyCommentURL = HN_STORYDETAILS_URL.replace(/\[ID\]/, id);

    request(storyCommentURL, function(evt) {
      callback(evt.target.response);
    });
  }

  function request(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = callback;
    xhr.send();
  }

  return {
    getTopStories: getTopStories,
    getStoryById: getStoryById,
    getStoryComment: getStoryComment
  };

})();

!(function(win) {

/**
 * FastDom
 *
 * Eliminates layout thrashing
 * by batching DOM read/write
 * interactions.
 *
 * @author Wilson Page <wilsonpage@me.com>
 * @author Kornel Lesinski <kornel.lesinski@ft.com>
 */

'use strict';

/**
 * Mini logger
 *
 * @return {Function}
 */
var debug = 0 ? console.log.bind(console, '[fastdom]') : function() {};

/**
 * Normalized rAF
 *
 * @type {Function}
 */
var raf = win.requestAnimationFrame
  || win.webkitRequestAnimationFrame
  || win.mozRequestAnimationFrame
  || win.msRequestAnimationFrame
  || function(cb) { return setTimeout(cb, 16); };

/**
 * Initialize a `FastDom`.
 *
 * @constructor
 */
function FastDom() {
  var self = this;
  self.reads = [];
  self.writes = [];
  self.raf = raf.bind(win); // test hook
  debug('initialized', self);
}

FastDom.prototype = {
  constructor: FastDom,

  /**
   * Adds a job to the read batch and
   * schedules a new frame if need be.
   *
   * @param  {Function} fn
   * @public
   */
  measure: function(fn, ctx) {
    debug('measure');
    var task = !ctx ? fn : fn.bind(ctx);
    this.reads.push(task);
    scheduleFlush(this);
    return task;
  },

  /**
   * Adds a job to the
   * write batch and schedules
   * a new frame if need be.
   *
   * @param  {Function} fn
   * @public
   */
  mutate: function(fn, ctx) {
    debug('mutate');
    var task = !ctx ? fn : fn.bind(ctx);
    this.writes.push(task);
    scheduleFlush(this);
    return task;
  },

  /**
   * Clears a scheduled 'read' or 'write' task.
   *
   * @param {Object} task
   * @return {Boolean} success
   * @public
   */
  clear: function(task) {
    debug('clear', task);
    return remove(this.reads, task) || remove(this.writes, task);
  },

  /**
   * Extend this FastDom with some
   * custom functionality.
   *
   * Because fastdom must *always* be a
   * singleton, we're actually extending
   * the fastdom instance. This means tasks
   * scheduled by an extension still enter
   * fastdom's global task queue.
   *
   * The 'super' instance can be accessed
   * from `this.fastdom`.
   *
   * @example
   *
   * var myFastdom = fastdom.extend({
   *   initialize: function() {
   *     // runs on creation
   *   },
   *
   *   // override a method
   *   measure: function(fn) {
   *     // do extra stuff ...
   *
   *     // then call the original
   *     return this.fastdom.measure(fn);
   *   },
   *
   *   ...
   * });
   *
   * @param  {Object} props  properties to mixin
   * @return {FastDom}
   */
  extend: function(props) {
    debug('extend', props);
    if (typeof props != 'object') throw new Error('expected object');

    var child = Object.create(this);
    mixin(child, props);
    child.fastdom = this;

    // run optional creation hook
    if (child.initialize) child.initialize();

    return child;
  },

  // override this with a function
  // to prevent Errors in console
  // when tasks throw
  catch: null
};

/**
 * Schedules a new read/write
 * batch if one isn't pending.
 *
 * @private
 */
function scheduleFlush(fastdom) {
  if (!fastdom.scheduled) {
    fastdom.scheduled = true;
    fastdom.raf(flush.bind(null, fastdom));
    debug('flush scheduled');
  }
}

/**
 * Runs queued `read` and `write` tasks.
 *
 * Errors are caught and thrown by default.
 * If a `.catch` function has been defined
 * it is called instead.
 *
 * @private
 */
function flush(fastdom) {
  debug('flush');

  var writes = fastdom.writes;
  var reads = fastdom.reads;
  var error;

  try {
    debug('flushing reads', reads.length);
    runTasks(reads);
    debug('flushing writes', writes.length);
    runTasks(writes);
  } catch (e) { error = e; }

  fastdom.scheduled = false;

  // If the batch errored we may still have tasks queued
  if (reads.length || writes.length) scheduleFlush(fastdom);

  if (error) {
    debug('task errored', error.message);
    if (fastdom.catch) fastdom.catch(error);
    else throw error;
  }
}

/**
 * We run this inside a try catch
 * so that if any jobs error, we
 * are able to recover and continue
 * to flush the batch until it's empty.
 *
 * @private
 */
function runTasks(tasks) {
  debug('run tasks');
  var task; while (task = tasks.shift()) task();
}

/**
 * Remove an item from an Array.
 *
 * @param  {Array} array
 * @param  {*} item
 * @return {Boolean}
 */
function remove(array, item) {
  var index = array.indexOf(item);
  return !!~index && !!array.splice(index, 1);
}

/**
 * Mixin own properties of source
 * object into the target.
 *
 * @param  {Object} target
 * @param  {Object} source
 */
function mixin(target, source) {
  for (var key in source) {
    if (source.hasOwnProperty(key)) target[key] = source[key];
  }
}

// There should never be more than
// one instance of `FastDom` in an app
var exports = win.fastdom = (win.fastdom || new FastDom()); // jshint ignore:line

// Expose to CJS & AMD
if ((typeof define)[0] == 'f') define(function() { return exports; });
else if ((typeof module)[0] == 'o') module.exports = exports;

})( typeof window !== 'undefined' ? window : this);

(function(){"use strict";function a(a){var b,c,d,e,f=Array.prototype.slice.call(arguments,1);for(b=0,c=f.length;c>b;b+=1)if(d=f[b])for(e in d)p.call(d,e)&&(a[e]=d[e]);return a}function b(a,b,c){this.locales=a,this.formats=b,this.pluralFn=c}function c(a){this.id=a}function d(a,b,c,d,e){this.id=a,this.useOrdinal=b,this.offset=c,this.options=d,this.pluralFn=e}function e(a,b,c,d){this.id=a,this.offset=b,this.numberFormat=c,this.string=d}function f(a,b){this.id=a,this.options=b}function g(a,b,c){var d="string"==typeof a?g.__parse(a):a;if(!d||"messageFormatPattern"!==d.type)throw new TypeError("A message must be provided as a String or AST.");c=this._mergeFormats(g.formats,c),r(this,"_locale",{value:this._resolveLocale(b)});var e=this._findPluralRuleFunction(this._locale),f=this._compilePattern(d,b,c,e),h=this;this.format=function(a){return h._format(f,a)}}function h(a){return 400*a/146097}function i(a,b){b=b||{},G(a)&&(a=a.concat()),D(this,"_locale",{value:this._resolveLocale(a)}),D(this,"_options",{value:{style:this._resolveStyle(b.style),units:this._isValidUnits(b.units)&&b.units}}),D(this,"_locales",{value:a}),D(this,"_fields",{value:this._findFields(this._locale)}),D(this,"_messages",{value:E(null)});var c=this;this.format=function(a,b){return c._format(a,b)}}function j(a){var b=Q(null);return function(){var c=Array.prototype.slice.call(arguments),d=k(c),e=d&&b[d];return e||(e=Q(a.prototype),a.apply(e,c),d&&(b[d]=e)),e}}function k(a){if("undefined"!=typeof JSON){var b,c,d,e=[];for(b=0,c=a.length;c>b;b+=1)d=a[b],e.push(d&&"object"==typeof d?l(d):d);return JSON.stringify(e)}}function l(a){var b,c,d,e,f=[],g=[];for(b in a)a.hasOwnProperty(b)&&g.push(b);var h=g.sort();for(c=0,d=h.length;d>c;c+=1)b=h[c],e={},e[b]=a[b],f[c]=e;return f}function m(a){var b,c,d,e,f=Array.prototype.slice.call(arguments,1);for(b=0,c=f.length;c>b;b+=1)if(d=f[b])for(e in d)d.hasOwnProperty(e)&&(a[e]=d[e]);return a}function n(a){function b(a,b){return function(){return"undefined"!=typeof console&&"function"==typeof console.warn&&console.warn("{{"+a+"}} is deprecated, use: {{"+b.name+"}}"),b.apply(this,arguments)}}function c(a){if(!a.fn)throw new Error("{{#intl}} must be invoked as a block helper");var b=p(a.data),c=m({},b.intl,a.hash);return b.intl=c,a.fn(this,{data:b})}function d(a,b){var c,d,e,f=b.data&&b.data.intl,g=a.split(".");try{for(e=0,d=g.length;d>e;e++)c=f=f[g[e]]}finally{if(void 0===c)throw new ReferenceError("Could not find Intl object: "+a)}return c}function e(a,b,c){a=new Date(a),k(a,"A date or timestamp must be provided to {{formatDate}}"),c||(c=b,b=null);var d=c.data.intl&&c.data.intl.locales,e=n("date",b,c);return T(d,e).format(a)}function f(a,b,c){a=new Date(a),k(a,"A date or timestamp must be provided to {{formatTime}}"),c||(c=b,b=null);var d=c.data.intl&&c.data.intl.locales,e=n("time",b,c);return T(d,e).format(a)}function g(a,b,c){a=new Date(a),k(a,"A date or timestamp must be provided to {{formatRelative}}"),c||(c=b,b=null);var d=c.data.intl&&c.data.intl.locales,e=n("relative",b,c),f=c.hash.now;return delete e.now,V(d,e).format(a,{now:f})}function h(a,b,c){l(a,"A number must be provided to {{formatNumber}}"),c||(c=b,b=null);var d=c.data.intl&&c.data.intl.locales,e=n("number",b,c);return S(d,e).format(a)}function i(a,b){b||(b=a,a=null);var c=b.hash;if(!a&&"string"!=typeof a&&!c.intlName)throw new ReferenceError("{{formatMessage}} must be provided a message or intlName");var e=b.data.intl||{},f=e.locales,g=e.formats;return!a&&c.intlName&&(a=d(c.intlName,b)),"function"==typeof a?a(c):("string"==typeof a&&(a=U(a,f,g)),a.format(c))}function j(){var a,b,c=[].slice.call(arguments).pop(),d=c.hash;for(a in d)d.hasOwnProperty(a)&&(b=d[a],"string"==typeof b&&(d[a]=q(b)));return new o(String(i.apply(this,arguments)))}function k(a,b){if(!isFinite(a))throw new TypeError(b)}function l(a,b){if("number"!=typeof a)throw new TypeError(b)}function n(a,b,c){var e,f=c.hash;return b?("string"==typeof b&&(e=d("formats."+a+"."+b,c)),e=m({},e,f)):e=f,e}var o=a.SafeString,p=a.createFrame,q=a.Utils.escapeExpression,r={intl:c,intlGet:d,formatDate:e,formatTime:f,formatRelative:g,formatNumber:h,formatMessage:i,formatHTMLMessage:j,intlDate:b("intlDate",e),intlTime:b("intlTime",f),intlNumber:b("intlNumber",h),intlMessage:b("intlMessage",i),intlHTMLMessage:b("intlHTMLMessage",j)};for(var s in r)r.hasOwnProperty(s)&&a.registerHelper(s,r[s])}function o(a){x.__addLocaleData(a),M.__addLocaleData(a)}var p=Object.prototype.hasOwnProperty,q=function(){try{return!!Object.defineProperty({},"a",{})}catch(a){return!1}}(),r=(!q&&!Object.prototype.__defineGetter__,q?Object.defineProperty:function(a,b,c){"get"in c&&a.__defineGetter__?a.__defineGetter__(b,c.get):(!p.call(a,b)||"value"in c)&&(a[b]=c.value)}),s=Object.create||function(a,b){function c(){}var d,e;c.prototype=a,d=new c;for(e in b)p.call(b,e)&&r(d,e,b[e]);return d},t=b;b.prototype.compile=function(a){return this.pluralStack=[],this.currentPlural=null,this.pluralNumberFormat=null,this.compileMessage(a)},b.prototype.compileMessage=function(a){if(!a||"messageFormatPattern"!==a.type)throw new Error('Message AST is not of type: "messageFormatPattern"');var b,c,d,e=a.elements,f=[];for(b=0,c=e.length;c>b;b+=1)switch(d=e[b],d.type){case"messageTextElement":f.push(this.compileMessageText(d));break;case"argumentElement":f.push(this.compileArgument(d));break;default:throw new Error("Message element does not have a valid type")}return f},b.prototype.compileMessageText=function(a){return this.currentPlural&&/(^|[^\\])#/g.test(a.value)?(this.pluralNumberFormat||(this.pluralNumberFormat=new Intl.NumberFormat(this.locales)),new e(this.currentPlural.id,this.currentPlural.format.offset,this.pluralNumberFormat,a.value)):a.value.replace(/\\#/g,"#")},b.prototype.compileArgument=function(a){var b=a.format;if(!b)return new c(a.id);var e,g=this.formats,h=this.locales,i=this.pluralFn;switch(b.type){case"numberFormat":return e=g.number[b.style],{id:a.id,format:new Intl.NumberFormat(h,e).format};case"dateFormat":return e=g.date[b.style],{id:a.id,format:new Intl.DateTimeFormat(h,e).format};case"timeFormat":return e=g.time[b.style],{id:a.id,format:new Intl.DateTimeFormat(h,e).format};case"pluralFormat":return e=this.compileOptions(a),new d(a.id,b.ordinal,b.offset,e,i);case"selectFormat":return e=this.compileOptions(a),new f(a.id,e);default:throw new Error("Message element does not have a valid format type")}},b.prototype.compileOptions=function(a){var b=a.format,c=b.options,d={};this.pluralStack.push(this.currentPlural),this.currentPlural="pluralFormat"===b.type?a:null;var e,f,g;for(e=0,f=c.length;f>e;e+=1)g=c[e],d[g.selector]=this.compileMessage(g.value);return this.currentPlural=this.pluralStack.pop(),d},c.prototype.format=function(a){return a?"string"==typeof a?a:String(a):""},d.prototype.getOption=function(a){var b=this.options,c=b["="+a]||b[this.pluralFn(a-this.offset,this.useOrdinal)];return c||b.other},e.prototype.format=function(a){var b=this.numberFormat.format(a-this.offset);return this.string.replace(/(^|[^\\])#/g,"$1"+b).replace(/\\#/g,"#")},f.prototype.getOption=function(a){var b=this.options;return b[a]||b.other};var u=function(){function a(a,b){function c(){this.constructor=a}c.prototype=b.prototype,a.prototype=new c}function b(a,b,c,d,e,f){this.message=a,this.expected=b,this.found=c,this.offset=d,this.line=e,this.column=f,this.name="SyntaxError"}function c(a){function c(b){function c(b,c,d){var e,f;for(e=c;d>e;e++)f=a.charAt(e),"\n"===f?(b.seenCR||b.line++,b.column=1,b.seenCR=!1):"\r"===f||"\u2028"===f||"\u2029"===f?(b.line++,b.column=1,b.seenCR=!0):(b.column++,b.seenCR=!1)}return Ua!==b&&(Ua>b&&(Ua=0,Va={line:1,column:1,seenCR:!1}),c(Va,Ua,b),Ua=b),Va}function d(a){Wa>Sa||(Sa>Wa&&(Wa=Sa,Xa=[]),Xa.push(a))}function e(d,e,f){function g(a){var b=1;for(a.sort(function(a,b){return a.description<b.description?-1:a.description>b.description?1:0});b<a.length;)a[b-1]===a[b]?a.splice(b,1):b++}function h(a,b){function c(a){function b(a){return a.charCodeAt(0).toString(16).toUpperCase()}return a.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\x08/g,"\\b").replace(/\t/g,"\\t").replace(/\n/g,"\\n").replace(/\f/g,"\\f").replace(/\r/g,"\\r").replace(/[\x00-\x07\x0B\x0E\x0F]/g,function(a){return"\\x0"+b(a)}).replace(/[\x10-\x1F\x80-\xFF]/g,function(a){return"\\x"+b(a)}).replace(/[\u0180-\u0FFF]/g,function(a){return"\\u0"+b(a)}).replace(/[\u1080-\uFFFF]/g,function(a){return"\\u"+b(a)})}var d,e,f,g=new Array(a.length);for(f=0;f<a.length;f++)g[f]=a[f].description;return d=a.length>1?g.slice(0,-1).join(", ")+" or "+g[a.length-1]:g[0],e=b?'"'+c(b)+'"':"end of input","Expected "+d+" but "+e+" found."}var i=c(f),j=f<a.length?a.charAt(f):null;return null!==e&&g(e),new b(null!==d?d:h(e,j),e,j,f,i.line,i.column)}function f(){var a;return a=g()}function g(){var a,b,c;for(a=Sa,b=[],c=h();c!==E;)b.push(c),c=h();return b!==E&&(Ta=a,b=H(b)),a=b}function h(){var a;return a=j(),a===E&&(a=l()),a}function i(){var b,c,d,e,f,g;if(b=Sa,c=[],d=Sa,e=w(),e!==E?(f=B(),f!==E?(g=w(),g!==E?(e=[e,f,g],d=e):(Sa=d,d=I)):(Sa=d,d=I)):(Sa=d,d=I),d!==E)for(;d!==E;)c.push(d),d=Sa,e=w(),e!==E?(f=B(),f!==E?(g=w(),g!==E?(e=[e,f,g],d=e):(Sa=d,d=I)):(Sa=d,d=I)):(Sa=d,d=I);else c=I;return c!==E&&(Ta=b,c=J(c)),b=c,b===E&&(b=Sa,c=v(),c!==E&&(c=a.substring(b,Sa)),b=c),b}function j(){var a,b;return a=Sa,b=i(),b!==E&&(Ta=a,b=K(b)),a=b}function k(){var b,c,e;if(b=z(),b===E){if(b=Sa,c=[],L.test(a.charAt(Sa))?(e=a.charAt(Sa),Sa++):(e=E,0===Ya&&d(M)),e!==E)for(;e!==E;)c.push(e),L.test(a.charAt(Sa))?(e=a.charAt(Sa),Sa++):(e=E,0===Ya&&d(M));else c=I;c!==E&&(c=a.substring(b,Sa)),b=c}return b}function l(){var b,c,e,f,g,h,i,j,l;return b=Sa,123===a.charCodeAt(Sa)?(c=N,Sa++):(c=E,0===Ya&&d(O)),c!==E?(e=w(),e!==E?(f=k(),f!==E?(g=w(),g!==E?(h=Sa,44===a.charCodeAt(Sa)?(i=Q,Sa++):(i=E,0===Ya&&d(R)),i!==E?(j=w(),j!==E?(l=m(),l!==E?(i=[i,j,l],h=i):(Sa=h,h=I)):(Sa=h,h=I)):(Sa=h,h=I),h===E&&(h=P),h!==E?(i=w(),i!==E?(125===a.charCodeAt(Sa)?(j=S,Sa++):(j=E,0===Ya&&d(T)),j!==E?(Ta=b,c=U(f,h),b=c):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I),b}function m(){var a;return a=n(),a===E&&(a=o(),a===E&&(a=p(),a===E&&(a=q()))),a}function n(){var b,c,e,f,g,h,i;return b=Sa,a.substr(Sa,6)===V?(c=V,Sa+=6):(c=E,0===Ya&&d(W)),c===E&&(a.substr(Sa,4)===X?(c=X,Sa+=4):(c=E,0===Ya&&d(Y)),c===E&&(a.substr(Sa,4)===Z?(c=Z,Sa+=4):(c=E,0===Ya&&d($)))),c!==E?(e=w(),e!==E?(f=Sa,44===a.charCodeAt(Sa)?(g=Q,Sa++):(g=E,0===Ya&&d(R)),g!==E?(h=w(),h!==E?(i=B(),i!==E?(g=[g,h,i],f=g):(Sa=f,f=I)):(Sa=f,f=I)):(Sa=f,f=I),f===E&&(f=P),f!==E?(Ta=b,c=_(c,f),b=c):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I),b}function o(){var b,c,e,f,g,h;return b=Sa,a.substr(Sa,6)===aa?(c=aa,Sa+=6):(c=E,0===Ya&&d(ba)),c!==E?(e=w(),e!==E?(44===a.charCodeAt(Sa)?(f=Q,Sa++):(f=E,0===Ya&&d(R)),f!==E?(g=w(),g!==E?(h=u(),h!==E?(Ta=b,c=ca(h),b=c):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I),b}function p(){var b,c,e,f,g,h;return b=Sa,a.substr(Sa,13)===da?(c=da,Sa+=13):(c=E,0===Ya&&d(ea)),c!==E?(e=w(),e!==E?(44===a.charCodeAt(Sa)?(f=Q,Sa++):(f=E,0===Ya&&d(R)),f!==E?(g=w(),g!==E?(h=u(),h!==E?(Ta=b,c=fa(h),b=c):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I),b}function q(){var b,c,e,f,g,h,i;if(b=Sa,a.substr(Sa,6)===ga?(c=ga,Sa+=6):(c=E,0===Ya&&d(ha)),c!==E)if(e=w(),e!==E)if(44===a.charCodeAt(Sa)?(f=Q,Sa++):(f=E,0===Ya&&d(R)),f!==E)if(g=w(),g!==E){if(h=[],i=s(),i!==E)for(;i!==E;)h.push(i),i=s();else h=I;h!==E?(Ta=b,c=ia(h),b=c):(Sa=b,b=I)}else Sa=b,b=I;else Sa=b,b=I;else Sa=b,b=I;else Sa=b,b=I;return b}function r(){var b,c,e,f;return b=Sa,c=Sa,61===a.charCodeAt(Sa)?(e=ja,Sa++):(e=E,0===Ya&&d(ka)),e!==E?(f=z(),f!==E?(e=[e,f],c=e):(Sa=c,c=I)):(Sa=c,c=I),c!==E&&(c=a.substring(b,Sa)),b=c,b===E&&(b=B()),b}function s(){var b,c,e,f,h,i,j,k,l;return b=Sa,c=w(),c!==E?(e=r(),e!==E?(f=w(),f!==E?(123===a.charCodeAt(Sa)?(h=N,Sa++):(h=E,0===Ya&&d(O)),h!==E?(i=w(),i!==E?(j=g(),j!==E?(k=w(),k!==E?(125===a.charCodeAt(Sa)?(l=S,Sa++):(l=E,0===Ya&&d(T)),l!==E?(Ta=b,c=la(e,j),b=c):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I),b}function t(){var b,c,e,f;return b=Sa,a.substr(Sa,7)===ma?(c=ma,Sa+=7):(c=E,0===Ya&&d(na)),c!==E?(e=w(),e!==E?(f=z(),f!==E?(Ta=b,c=oa(f),b=c):(Sa=b,b=I)):(Sa=b,b=I)):(Sa=b,b=I),b}function u(){var a,b,c,d,e;if(a=Sa,b=t(),b===E&&(b=P),b!==E)if(c=w(),c!==E){if(d=[],e=s(),e!==E)for(;e!==E;)d.push(e),e=s();else d=I;d!==E?(Ta=a,b=pa(b,d),a=b):(Sa=a,a=I)}else Sa=a,a=I;else Sa=a,a=I;return a}function v(){var b,c;if(Ya++,b=[],ra.test(a.charAt(Sa))?(c=a.charAt(Sa),Sa++):(c=E,0===Ya&&d(sa)),c!==E)for(;c!==E;)b.push(c),ra.test(a.charAt(Sa))?(c=a.charAt(Sa),Sa++):(c=E,0===Ya&&d(sa));else b=I;return Ya--,b===E&&(c=E,0===Ya&&d(qa)),b}function w(){var b,c,e;for(Ya++,b=Sa,c=[],e=v();e!==E;)c.push(e),e=v();return c!==E&&(c=a.substring(b,Sa)),b=c,Ya--,b===E&&(c=E,0===Ya&&d(ta)),b}function x(){var b;return ua.test(a.charAt(Sa))?(b=a.charAt(Sa),Sa++):(b=E,0===Ya&&d(va)),b}function y(){var b;return wa.test(a.charAt(Sa))?(b=a.charAt(Sa),Sa++):(b=E,0===Ya&&d(xa)),b}function z(){var b,c,e,f,g,h;if(b=Sa,48===a.charCodeAt(Sa)?(c=ya,Sa++):(c=E,0===Ya&&d(za)),c===E){if(c=Sa,e=Sa,Aa.test(a.charAt(Sa))?(f=a.charAt(Sa),Sa++):(f=E,0===Ya&&d(Ba)),f!==E){for(g=[],h=x();h!==E;)g.push(h),h=x();g!==E?(f=[f,g],e=f):(Sa=e,e=I)}else Sa=e,e=I;e!==E&&(e=a.substring(c,Sa)),c=e}return c!==E&&(Ta=b,c=Ca(c)),b=c}function A(){var b,c,e,f,g,h,i,j;return Da.test(a.charAt(Sa))?(b=a.charAt(Sa),Sa++):(b=E,0===Ya&&d(Ea)),b===E&&(b=Sa,a.substr(Sa,2)===Fa?(c=Fa,Sa+=2):(c=E,0===Ya&&d(Ga)),c!==E&&(Ta=b,c=Ha()),b=c,b===E&&(b=Sa,a.substr(Sa,2)===Ia?(c=Ia,Sa+=2):(c=E,0===Ya&&d(Ja)),c!==E&&(Ta=b,c=Ka()),b=c,b===E&&(b=Sa,a.substr(Sa,2)===La?(c=La,Sa+=2):(c=E,0===Ya&&d(Ma)),c!==E&&(Ta=b,c=Na()),b=c,b===E&&(b=Sa,a.substr(Sa,2)===Oa?(c=Oa,Sa+=2):(c=E,0===Ya&&d(Pa)),c!==E?(e=Sa,f=Sa,g=y(),g!==E?(h=y(),h!==E?(i=y(),i!==E?(j=y(),j!==E?(g=[g,h,i,j],f=g):(Sa=f,f=I)):(Sa=f,f=I)):(Sa=f,f=I)):(Sa=f,f=I),f!==E&&(f=a.substring(e,Sa)),e=f,e!==E?(Ta=b,c=Qa(e),b=c):(Sa=b,b=I)):(Sa=b,b=I))))),b}function B(){var a,b,c;if(a=Sa,b=[],c=A(),c!==E)for(;c!==E;)b.push(c),c=A();else b=I;return b!==E&&(Ta=a,b=Ra(b)),a=b}var C,D=arguments.length>1?arguments[1]:{},E={},F={start:f},G=f,H=function(a){return{type:"messageFormatPattern",elements:a}},I=E,J=function(a){var b,c,d,e,f,g="";for(b=0,d=a.length;d>b;b+=1)for(e=a[b],c=0,f=e.length;f>c;c+=1)g+=e[c];return g},K=function(a){return{type:"messageTextElement",value:a}},L=/^[^ \t\n\r,.+={}#]/,M={type:"class",value:"[^ \\t\\n\\r,.+={}#]",description:"[^ \\t\\n\\r,.+={}#]"},N="{",O={type:"literal",value:"{",description:'"{"'},P=null,Q=",",R={type:"literal",value:",",description:'","'},S="}",T={type:"literal",value:"}",description:'"}"'},U=function(a,b){return{type:"argumentElement",id:a,format:b&&b[2]}},V="number",W={type:"literal",value:"number",description:'"number"'},X="date",Y={type:"literal",value:"date",description:'"date"'},Z="time",$={type:"literal",value:"time",description:'"time"'},_=function(a,b){return{type:a+"Format",style:b&&b[2]}},aa="plural",ba={type:"literal",value:"plural",description:'"plural"'},ca=function(a){return{type:a.type,ordinal:!1,offset:a.offset||0,options:a.options}},da="selectordinal",ea={type:"literal",value:"selectordinal",description:'"selectordinal"'},fa=function(a){return{type:a.type,ordinal:!0,offset:a.offset||0,options:a.options}},ga="select",ha={type:"literal",value:"select",description:'"select"'},ia=function(a){return{type:"selectFormat",options:a}},ja="=",ka={type:"literal",value:"=",description:'"="'},la=function(a,b){return{type:"optionalFormatPattern",selector:a,value:b}},ma="offset:",na={type:"literal",value:"offset:",description:'"offset:"'},oa=function(a){return a},pa=function(a,b){return{type:"pluralFormat",offset:a,options:b}},qa={type:"other",description:"whitespace"},ra=/^[ \t\n\r]/,sa={type:"class",value:"[ \\t\\n\\r]",description:"[ \\t\\n\\r]"},ta={type:"other",description:"optionalWhitespace"},ua=/^[0-9]/,va={type:"class",value:"[0-9]",description:"[0-9]"},wa=/^[0-9a-f]/i,xa={type:"class",value:"[0-9a-f]i",description:"[0-9a-f]i"},ya="0",za={type:"literal",value:"0",description:'"0"'},Aa=/^[1-9]/,Ba={type:"class",value:"[1-9]",description:"[1-9]"},Ca=function(a){return parseInt(a,10)},Da=/^[^{}\\\0-\x1F \t\n\r]/,Ea={type:"class",value:"[^{}\\\\\\0-\\x1F \\t\\n\\r]",description:"[^{}\\\\\\0-\\x1F \\t\\n\\r]"},Fa="\\#",Ga={type:"literal",value:"\\#",description:'"\\\\#"'},Ha=function(){return"\\#"},Ia="\\{",Ja={type:"literal",value:"\\{",description:'"\\\\{"'},Ka=function(){return"{"},La="\\}",Ma={type:"literal",value:"\\}",description:'"\\\\}"'},Na=function(){return"}"},Oa="\\u",Pa={type:"literal",value:"\\u",description:'"\\\\u"'},Qa=function(a){return String.fromCharCode(parseInt(a,16))},Ra=function(a){return a.join("")},Sa=0,Ta=0,Ua=0,Va={line:1,column:1,seenCR:!1},Wa=0,Xa=[],Ya=0;if("startRule"in D){if(!(D.startRule in F))throw new Error("Can't start parsing from rule \""+D.startRule+'".');G=F[D.startRule]}if(C=G(),C!==E&&Sa===a.length)return C;throw C!==E&&Sa<a.length&&d({type:"end",description:"end of input"}),e(null,Xa,Wa)}return a(b,Error),{SyntaxError:b,parse:c}}(),v=g;r(g,"formats",{enumerable:!0,value:{number:{currency:{style:"currency"},percent:{style:"percent"}},date:{"short":{month:"numeric",day:"numeric",year:"2-digit"},medium:{month:"short",day:"numeric",year:"numeric"},"long":{month:"long",day:"numeric",year:"numeric"},full:{weekday:"long",month:"long",day:"numeric",year:"numeric"}},time:{"short":{hour:"numeric",minute:"numeric"},medium:{hour:"numeric",minute:"numeric",second:"numeric"},"long":{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"},full:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"}}}}),r(g,"__localeData__",{value:s(null)}),r(g,"__addLocaleData",{value:function(a){if(!a||!a.locale)throw new Error("Locale data provided to IntlMessageFormat is missing a `locale` property");g.__localeData__[a.locale.toLowerCase()]=a}}),r(g,"__parse",{value:u.parse}),r(g,"defaultLocale",{enumerable:!0,writable:!0,value:void 0}),g.prototype.resolvedOptions=function(){return{locale:this._locale}},g.prototype._compilePattern=function(a,b,c,d){var e=new t(b,c,d);return e.compile(a)},g.prototype._findPluralRuleFunction=function(a){for(var b=g.__localeData__,c=b[a.toLowerCase()];c;){if(c.pluralRuleFunction)return c.pluralRuleFunction;c=c.parentLocale&&b[c.parentLocale.toLowerCase()]}throw new Error("Locale data added to IntlMessageFormat is missing a `pluralRuleFunction` for :"+a)},g.prototype._format=function(a,b){var c,d,e,f,g,h="";for(c=0,d=a.length;d>c;c+=1)if(e=a[c],"string"!=typeof e){if(f=e.id,!b||!p.call(b,f))throw new Error("A value must be provided for: "+f);g=b[f],h+=e.options?this._format(e.getOption(g),b):e.format(g)}else h+=e;return h},g.prototype._mergeFormats=function(b,c){var d,e,f={};for(d in b)p.call(b,d)&&(f[d]=e=s(b[d]),c&&p.call(c,d)&&a(e,c[d]));return f},g.prototype._resolveLocale=function(a){"string"==typeof a&&(a=[a]),a=(a||[]).concat(g.defaultLocale);var b,c,d,e,f=g.__localeData__;for(b=0,c=a.length;c>b;b+=1)for(d=a[b].toLowerCase().split("-");d.length;){if(e=f[d.join("-")])return e.locale;d.pop()}var h=a.pop();throw new Error("No locale data has been added to IntlMessageFormat for: "+a.join(", ")+", or the default locale: "+h)};var w={locale:"en",pluralRuleFunction:function(a,b){var c=String(a).split("."),d=!c[1],e=Number(c[0])==a,f=e&&c[0].slice(-1),g=e&&c[0].slice(-2);return b?1==f&&11!=g?"one":2==f&&12!=g?"two":3==f&&13!=g?"few":"other":1==a&&d?"one":"other"}};v.__addLocaleData(w),v.defaultLocale="en";var x=v,y=Math.round,z=function(a,b){a=+a,b=+b;var c=y(b-a),d=y(c/1e3),e=y(d/60),f=y(e/60),g=y(f/24),i=y(g/7),j=h(g),k=y(12*j),l=y(j);return{millisecond:c,second:d,minute:e,hour:f,day:g,week:i,month:k,year:l}},A=Object.prototype.hasOwnProperty,B=Object.prototype.toString,C=function(){try{return!!Object.defineProperty({},"a",{})}catch(a){return!1}}(),D=(!C&&!Object.prototype.__defineGetter__,C?Object.defineProperty:function(a,b,c){"get"in c&&a.__defineGetter__?a.__defineGetter__(b,c.get):(!A.call(a,b)||"value"in c)&&(a[b]=c.value)}),E=Object.create||function(a,b){function c(){}var d,e;c.prototype=a,d=new c;for(e in b)A.call(b,e)&&D(d,e,b[e]);return d},F=Array.prototype.indexOf||function(a,b){var c=this;if(!c.length)return-1;for(var d=b||0,e=c.length;e>d;d++)if(c[d]===a)return d;return-1},G=Array.isArray||function(a){return"[object Array]"===B.call(a)},H=Date.now||function(){return(new Date).getTime()},I=i,J=["second","minute","hour","day","month","year"],K=["best fit","numeric"];D(i,"__localeData__",{value:E(null)}),D(i,"__addLocaleData",{value:function(a){if(!a||!a.locale)throw new Error("Locale data provided to IntlRelativeFormat is missing a `locale` property value");i.__localeData__[a.locale.toLowerCase()]=a,x.__addLocaleData(a)}}),D(i,"defaultLocale",{enumerable:!0,writable:!0,value:void 0}),D(i,"thresholds",{enumerable:!0,value:{second:45,minute:45,hour:22,day:26,month:11}}),i.prototype.resolvedOptions=function(){return{locale:this._locale,style:this._options.style,units:this._options.units}},i.prototype._compileMessage=function(a){var b,c=this._locales,d=(this._locale,this._fields[a]),e=d.relativeTime,f="",g="";for(b in e.future)e.future.hasOwnProperty(b)&&(f+=" "+b+" {"+e.future[b].replace("{0}","#")+"}");for(b in e.past)e.past.hasOwnProperty(b)&&(g+=" "+b+" {"+e.past[b].replace("{0}","#")+"}");var h="{when, select, future {{0, plural, "+f+"}}past {{0, plural, "+g+"}}}";return new x(h,c)},i.prototype._getMessage=function(a){var b=this._messages;return b[a]||(b[a]=this._compileMessage(a)),b[a]},i.prototype._getRelativeUnits=function(a,b){var c=this._fields[b];return c.relative?c.relative[a]:void 0},i.prototype._findFields=function(a){for(var b=i.__localeData__,c=b[a.toLowerCase()];c;){if(c.fields)return c.fields;c=c.parentLocale&&b[c.parentLocale.toLowerCase()]}throw new Error("Locale data added to IntlRelativeFormat is missing `fields` for :"+a)},i.prototype._format=function(a,b){var c=b&&void 0!==b.now?b.now:H();if(void 0===a&&(a=c),!isFinite(c))throw new RangeError("The `now` option provided to IntlRelativeFormat#format() is not in valid range.");if(!isFinite(a))throw new RangeError("The date value provided to IntlRelativeFormat#format() is not in valid range.");var d=z(c,a),e=this._options.units||this._selectUnits(d),f=d[e];if("numeric"!==this._options.style){var g=this._getRelativeUnits(f,e);if(g)return g}return this._getMessage(e).format({0:Math.abs(f),when:0>f?"past":"future"})},i.prototype._isValidUnits=function(a){if(!a||F.call(J,a)>=0)return!0;if("string"==typeof a){var b=/s$/.test(a)&&a.substr(0,a.length-1);if(b&&F.call(J,b)>=0)throw new Error('"'+a+'" is not a valid IntlRelativeFormat `units` value, did you mean: '+b)}throw new Error('"'+a+'" is not a valid IntlRelativeFormat `units` value, it must be one of: "'+J.join('", "')+'"')},i.prototype._resolveLocale=function(a){"string"==typeof a&&(a=[a]),a=(a||[]).concat(i.defaultLocale);var b,c,d,e,f=i.__localeData__;for(b=0,c=a.length;c>b;b+=1)for(d=a[b].toLowerCase().split("-");d.length;){if(e=f[d.join("-")])return e.locale;d.pop()}var g=a.pop();throw new Error("No locale data has been added to IntlRelativeFormat for: "+a.join(", ")+", or the default locale: "+g)},i.prototype._resolveStyle=function(a){if(!a)return K[0];if(F.call(K,a)>=0)return a;throw new Error('"'+a+'" is not a valid IntlRelativeFormat `style` value, it must be one of: "'+K.join('", "')+'"')},i.prototype._selectUnits=function(a){var b,c,d;for(b=0,c=J.length;c>b&&(d=J[b],!(Math.abs(a[d])<i.thresholds[d]));b+=1);return d};var L={locale:"en",pluralRuleFunction:function(a,b){var c=String(a).split("."),d=!c[1],e=Number(c[0])==a,f=e&&c[0].slice(-1),g=e&&c[0].slice(-2);return b?1==f&&11!=g?"one":2==f&&12!=g?"two":3==f&&13!=g?"few":"other":1==a&&d?"one":"other"},fields:{year:{displayName:"Year",relative:{0:"this year",1:"next year","-1":"last year"},relativeTime:{future:{one:"in {0} year",other:"in {0} years"},past:{one:"{0} year ago",other:"{0} years ago"}}},month:{displayName:"Month",relative:{0:"this month",1:"next month","-1":"last month"},relativeTime:{future:{one:"in {0} month",other:"in {0} months"},past:{one:"{0} month ago",other:"{0} months ago"}}},day:{displayName:"Day",relative:{0:"today",1:"tomorrow","-1":"yesterday"},relativeTime:{future:{one:"in {0} day",other:"in {0} days"},past:{one:"{0} day ago",other:"{0} days ago"}}},hour:{displayName:"Hour",relativeTime:{future:{one:"in {0} hour",other:"in {0} hours"},past:{one:"{0} hour ago",other:"{0} hours ago"}}},minute:{displayName:"Minute",relativeTime:{future:{one:"in {0} minute",other:"in {0} minutes"},past:{one:"{0} minute ago",other:"{0} minutes ago"}}},second:{displayName:"Second",relative:{0:"now"},relativeTime:{future:{one:"in {0} second",other:"in {0} seconds"},past:{one:"{0} second ago",other:"{0} seconds ago"}}}}};I.__addLocaleData(L),I.defaultLocale="en";var M=I,N=Object.prototype.hasOwnProperty,O=function(){try{return!!Object.defineProperty({},"a",{})}catch(a){return!1}}(),P=(!O&&!Object.prototype.__defineGetter__,O?Object.defineProperty:function(a,b,c){"get"in c&&a.__defineGetter__?a.__defineGetter__(b,c.get):(!N.call(a,b)||"value"in c)&&(a[b]=c.value)}),Q=Object.create||function(a,b){function c(){}var d,e;c.prototype=a,d=new c;for(e in b)N.call(b,e)&&P(d,e,b[e]);return d},R=j,S=R(Intl.NumberFormat),T=R(Intl.DateTimeFormat),U=R(x),V=R(M),W={locale:"en",pluralRuleFunction:function(a,b){var c=String(a).split("."),d=!c[1],e=Number(c[0])==a,f=e&&c[0].slice(-1),g=e&&c[0].slice(-2);return b?1==f&&11!=g?"one":2==f&&12!=g?"two":3==f&&13!=g?"few":"other":1==a&&d?"one":"other"},fields:{year:{displayName:"Year",relative:{0:"this year",1:"next year","-1":"last year"},relativeTime:{future:{one:"in {0} year",other:"in {0} years"},past:{one:"{0} year ago",other:"{0} years ago"}}},month:{displayName:"Month",relative:{0:"this month",1:"next month","-1":"last month"},relativeTime:{future:{one:"in {0} month",other:"in {0} months"},past:{one:"{0} month ago",other:"{0} months ago"}}},day:{displayName:"Day",relative:{0:"today",1:"tomorrow","-1":"yesterday"},relativeTime:{future:{one:"in {0} day",other:"in {0} days"},past:{one:"{0} day ago",other:"{0} days ago"}}},hour:{displayName:"Hour",relativeTime:{future:{one:"in {0} hour",other:"in {0} hours"},past:{one:"{0} hour ago",other:"{0} hours ago"}}},minute:{displayName:"Minute",relativeTime:{future:{one:"in {0} minute",other:"in {0} minutes"},past:{one:"{0} minute ago",other:"{0} minutes ago"}}},second:{displayName:"Second",relative:{0:"now"},relativeTime:{future:{one:"in {0} second",other:"in {0} seconds"},past:{one:"{0} second ago",other:"{0} seconds ago"}}}}};o(W);var X={registerWith:n,__addLocaleData:o};this.HandlebarsIntl=X}).call(this);

/*!

 handlebars v3.0.0

Copyright (C) 2011-2014 by Yehuda Katz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

@license
*/
/* exported Handlebars */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Handlebars = factory();
  }
}(this, function () {
// handlebars/utils.js
var __module3__ = (function() {
  "use strict";
  var __exports__ = {};
  /*jshint -W004 */
  var escape = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "`": "&#x60;"
  };

  var badChars = /[&<>"'`]/g;
  var possible = /[&<>"'`]/;

  function escapeChar(chr) {
    return escape[chr];
  }

  function extend(obj /* , ...source */) {
    for (var i = 1; i < arguments.length; i++) {
      for (var key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          obj[key] = arguments[i][key];
        }
      }
    }

    return obj;
  }

  __exports__.extend = extend;var toString = Object.prototype.toString;
  __exports__.toString = toString;
  // Sourced from lodash
  // https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
  var isFunction = function(value) {
    return typeof value === 'function';
  };
  // fallback for older versions of Chrome and Safari
  /* istanbul ignore next */
  if (isFunction(/x/)) {
    isFunction = function(value) {
      return typeof value === 'function' && toString.call(value) === '[object Function]';
    };
  }
  var isFunction;
  __exports__.isFunction = isFunction;
  /* istanbul ignore next */
  var isArray = Array.isArray || function(value) {
    return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
  };
  __exports__.isArray = isArray;
  // Older IE versions do not directly support indexOf so we must implement our own, sadly.
  function indexOf(array, value) {
    for (var i = 0, len = array.length; i < len; i++) {
      if (array[i] === value) {
        return i;
      }
    }
    return -1;
  }

  __exports__.indexOf = indexOf;
  function escapeExpression(string) {
    // don't escape SafeStrings, since they're already safe
    if (string && string.toHTML) {
      return string.toHTML();
    } else if (string == null) {
      return "";
    } else if (!string) {
      return string + '';
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = "" + string;

    if(!possible.test(string)) { return string; }
    return string.replace(badChars, escapeChar);
  }

  __exports__.escapeExpression = escapeExpression;function isEmpty(value) {
    if (!value && value !== 0) {
      return true;
    } else if (isArray(value) && value.length === 0) {
      return true;
    } else {
      return false;
    }
  }

  __exports__.isEmpty = isEmpty;function blockParams(params, ids) {
    params.path = ids;
    return params;
  }

  __exports__.blockParams = blockParams;function appendContextPath(contextPath, id) {
    return (contextPath ? contextPath + '.' : '') + id;
  }

  __exports__.appendContextPath = appendContextPath;
  return __exports__;
})();

// handlebars/exception.js
var __module4__ = (function() {
  "use strict";
  var __exports__;

  var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

  function Exception(message, node) {
    var loc = node && node.loc,
        line,
        column;
    if (loc) {
      line = loc.start.line;
      column = loc.start.column;

      message += ' - ' + line + ':' + column;
    }

    var tmp = Error.prototype.constructor.call(this, message);

    // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
    for (var idx = 0; idx < errorProps.length; idx++) {
      this[errorProps[idx]] = tmp[errorProps[idx]];
    }

    if (loc) {
      this.lineNumber = line;
      this.column = column;
    }
  }

  Exception.prototype = new Error();

  __exports__ = Exception;
  return __exports__;
})();

// handlebars/base.js
var __module2__ = (function(__dependency1__, __dependency2__) {
  "use strict";
  var __exports__ = {};
  var Utils = __dependency1__;
  var Exception = __dependency2__;

  var VERSION = "3.0.0";
  __exports__.VERSION = VERSION;var COMPILER_REVISION = 6;
  __exports__.COMPILER_REVISION = COMPILER_REVISION;
  var REVISION_CHANGES = {
    1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
    2: '== 1.0.0-rc.3',
    3: '== 1.0.0-rc.4',
    4: '== 1.x.x',
    5: '== 2.0.0-alpha.x',
    6: '>= 2.0.0-beta.1'
  };
  __exports__.REVISION_CHANGES = REVISION_CHANGES;
  var isArray = Utils.isArray,
      isFunction = Utils.isFunction,
      toString = Utils.toString,
      objectType = '[object Object]';

  function HandlebarsEnvironment(helpers, partials) {
    this.helpers = helpers || {};
    this.partials = partials || {};

    registerDefaultHelpers(this);
  }

  __exports__.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
    constructor: HandlebarsEnvironment,

    logger: logger,
    log: log,

    registerHelper: function(name, fn) {
      if (toString.call(name) === objectType) {
        if (fn) { throw new Exception('Arg not supported with multiple helpers'); }
        Utils.extend(this.helpers, name);
      } else {
        this.helpers[name] = fn;
      }
    },
    unregisterHelper: function(name) {
      delete this.helpers[name];
    },

    registerPartial: function(name, partial) {
      if (toString.call(name) === objectType) {
        Utils.extend(this.partials,  name);
      } else {
        if (typeof partial === 'undefined') {
          throw new Exception('Attempting to register a partial as undefined');
        }
        this.partials[name] = partial;
      }
    },
    unregisterPartial: function(name) {
      delete this.partials[name];
    }
  };

  function registerDefaultHelpers(instance) {
    instance.registerHelper('helperMissing', function(/* [args, ]options */) {
      if(arguments.length === 1) {
        // A missing field in a {{foo}} constuct.
        return undefined;
      } else {
        // Someone is actually trying to call something, blow up.
        throw new Exception("Missing helper: '" + arguments[arguments.length-1].name + "'");
      }
    });

    instance.registerHelper('blockHelperMissing', function(context, options) {
      var inverse = options.inverse,
          fn = options.fn;

      if(context === true) {
        return fn(this);
      } else if(context === false || context == null) {
        return inverse(this);
      } else if (isArray(context)) {
        if(context.length > 0) {
          if (options.ids) {
            options.ids = [options.name];
          }

          return instance.helpers.each(context, options);
        } else {
          return inverse(this);
        }
      } else {
        if (options.data && options.ids) {
          var data = createFrame(options.data);
          data.contextPath = Utils.appendContextPath(options.data.contextPath, options.name);
          options = {data: data};
        }

        return fn(context, options);
      }
    });

    instance.registerHelper('each', function(context, options) {
      if (!options) {
        throw new Exception('Must pass iterator to #each');
      }

      var fn = options.fn, inverse = options.inverse;
      var i = 0, ret = "", data;

      var contextPath;
      if (options.data && options.ids) {
        contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
      }

      if (isFunction(context)) { context = context.call(this); }

      if (options.data) {
        data = createFrame(options.data);
      }

      function execIteration(key, i, last) {
        if (data) {
          data.key = key;
          data.index = i;
          data.first = i === 0;
          data.last  = !!last;

          if (contextPath) {
            data.contextPath = contextPath + key;
          }
        }

        ret = ret + fn(context[key], {
          data: data,
          blockParams: Utils.blockParams([context[key], key], [contextPath + key, null])
        });
      }

      if(context && typeof context === 'object') {
        if (isArray(context)) {
          for(var j = context.length; i<j; i++) {
            execIteration(i, i, i === context.length-1);
          }
        } else {
          var priorKey;

          for(var key in context) {
            if(context.hasOwnProperty(key)) {
              // We're running the iterations one step out of sync so we can detect
              // the last iteration without have to scan the object twice and create
              // an itermediate keys array. 
              if (priorKey) {
                execIteration(priorKey, i-1);
              }
              priorKey = key;
              i++;
            }
          }
          if (priorKey) {
            execIteration(priorKey, i-1, true);
          }
        }
      }

      if(i === 0){
        ret = inverse(this);
      }

      return ret;
    });

    instance.registerHelper('if', function(conditional, options) {
      if (isFunction(conditional)) { conditional = conditional.call(this); }

      // Default behavior is to render the positive path if the value is truthy and not empty.
      // The `includeZero` option may be set to treat the condtional as purely not empty based on the
      // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
      if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
        return options.inverse(this);
      } else {
        return options.fn(this);
      }
    });

    instance.registerHelper('unless', function(conditional, options) {
      return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
    });

    instance.registerHelper('with', function(context, options) {
      if (isFunction(context)) { context = context.call(this); }

      var fn = options.fn;

      if (!Utils.isEmpty(context)) {
        if (options.data && options.ids) {
          var data = createFrame(options.data);
          data.contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]);
          options = {data:data};
        }

        return fn(context, options);
      } else {
        return options.inverse(this);
      }
    });

    instance.registerHelper('log', function(message, options) {
      var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
      instance.log(level, message);
    });

    instance.registerHelper('lookup', function(obj, field) {
      return obj && obj[field];
    });
  }

  var logger = {
    methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

    // State enum
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    level: 1,

    // Can be overridden in the host environment
    log: function(level, message) {
      if (typeof console !== 'undefined' && logger.level <= level) {
        var method = logger.methodMap[level];
        (console[method] || console.log).call(console, message);
      }
    }
  };
  __exports__.logger = logger;
  var log = logger.log;
  __exports__.log = log;
  var createFrame = function(object) {
    var frame = Utils.extend({}, object);
    frame._parent = object;
    return frame;
  };
  __exports__.createFrame = createFrame;
  return __exports__;
})(__module3__, __module4__);

// handlebars/safe-string.js
var __module5__ = (function() {
  "use strict";
  var __exports__;
  // Build out our basic SafeString type
  function SafeString(string) {
    this.string = string;
  }

  SafeString.prototype.toString = SafeString.prototype.toHTML = function() {
    return "" + this.string;
  };

  __exports__ = SafeString;
  return __exports__;
})();

// handlebars/runtime.js
var __module6__ = (function(__dependency1__, __dependency2__, __dependency3__) {
  "use strict";
  var __exports__ = {};
  var Utils = __dependency1__;
  var Exception = __dependency2__;
  var COMPILER_REVISION = __dependency3__.COMPILER_REVISION;
  var REVISION_CHANGES = __dependency3__.REVISION_CHANGES;
  var createFrame = __dependency3__.createFrame;

  function checkRevision(compilerInfo) {
    var compilerRevision = compilerInfo && compilerInfo[0] || 1,
        currentRevision = COMPILER_REVISION;

    if (compilerRevision !== currentRevision) {
      if (compilerRevision < currentRevision) {
        var runtimeVersions = REVISION_CHANGES[currentRevision],
            compilerVersions = REVISION_CHANGES[compilerRevision];
        throw new Exception("Template was precompiled with an older version of Handlebars than the current runtime. "+
              "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
      } else {
        // Use the embedded version info since the runtime doesn't know about this revision yet
        throw new Exception("Template was precompiled with a newer version of Handlebars than the current runtime. "+
              "Please update your runtime to a newer version ("+compilerInfo[1]+").");
      }
    }
  }

  __exports__.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

  function template(templateSpec, env) {
    /* istanbul ignore next */
    if (!env) {
      throw new Exception("No environment passed to template");
    }
    if (!templateSpec || !templateSpec.main) {
      throw new Exception('Unknown template object: ' + typeof templateSpec);
    }

    // Note: Using env.VM references rather than local var references throughout this section to allow
    // for external users to override these as psuedo-supported APIs.
    env.VM.checkRevision(templateSpec.compiler);

    var invokePartialWrapper = function(partial, context, options) {
      if (options.hash) {
        context = Utils.extend({}, context, options.hash);
      }

      partial = env.VM.resolvePartial.call(this, partial, context, options);
      var result = env.VM.invokePartial.call(this, partial, context, options);

      if (result == null && env.compile) {
        options.partials[options.name] = env.compile(partial, templateSpec.compilerOptions, env);
        result = options.partials[options.name](context, options);
      }
      if (result != null) {
        if (options.indent) {
          var lines = result.split('\n');
          for (var i = 0, l = lines.length; i < l; i++) {
            if (!lines[i] && i + 1 === l) {
              break;
            }

            lines[i] = options.indent + lines[i];
          }
          result = lines.join('\n');
        }
        return result;
      } else {
        throw new Exception("The partial " + options.name + " could not be compiled when running in runtime-only mode");
      }
    };

    // Just add water
    var container = {
      strict: function(obj, name) {
        if (!(name in obj)) {
          throw new Exception('"' + name + '" not defined in ' + obj);
        }
        return obj[name];
      },
      lookup: function(depths, name) {
        var len = depths.length;
        for (var i = 0; i < len; i++) {
          if (depths[i] && depths[i][name] != null) {
            return depths[i][name];
          }
        }
      },
      lambda: function(current, context) {
        return typeof current === 'function' ? current.call(context) : current;
      },

      escapeExpression: Utils.escapeExpression,
      invokePartial: invokePartialWrapper,

      fn: function(i) {
        return templateSpec[i];
      },

      programs: [],
      program: function(i, data, declaredBlockParams, blockParams, depths) {
        var programWrapper = this.programs[i],
            fn = this.fn(i);
        if (data || depths || blockParams || declaredBlockParams) {
          programWrapper = program(this, i, fn, data, declaredBlockParams, blockParams, depths);
        } else if (!programWrapper) {
          programWrapper = this.programs[i] = program(this, i, fn);
        }
        return programWrapper;
      },

      data: function(data, depth) {
        while (data && depth--) {
          data = data._parent;
        }
        return data;
      },
      merge: function(param, common) {
        var ret = param || common;

        if (param && common && (param !== common)) {
          ret = Utils.extend({}, common, param);
        }

        return ret;
      },

      noop: env.VM.noop,
      compilerInfo: templateSpec.compiler
    };

    var ret = function(context, options) {
      options = options || {};
      var data = options.data;

      ret._setup(options);
      if (!options.partial && templateSpec.useData) {
        data = initData(context, data);
      }
      var depths,
          blockParams = templateSpec.useBlockParams ? [] : undefined;
      if (templateSpec.useDepths) {
        depths = options.depths ? [context].concat(options.depths) : [context];
      }

      return templateSpec.main.call(container, context, container.helpers, container.partials, data, blockParams, depths);
    };
    ret.isTop = true;

    ret._setup = function(options) {
      if (!options.partial) {
        container.helpers = container.merge(options.helpers, env.helpers);

        if (templateSpec.usePartial) {
          container.partials = container.merge(options.partials, env.partials);
        }
      } else {
        container.helpers = options.helpers;
        container.partials = options.partials;
      }
    };

    ret._child = function(i, data, blockParams, depths) {
      if (templateSpec.useBlockParams && !blockParams) {
        throw new Exception('must pass block params');
      }
      if (templateSpec.useDepths && !depths) {
        throw new Exception('must pass parent depths');
      }

      return program(container, i, templateSpec[i], data, 0, blockParams, depths);
    };
    return ret;
  }

  __exports__.template = template;function program(container, i, fn, data, declaredBlockParams, blockParams, depths) {
    var prog = function(context, options) {
      options = options || {};

      return fn.call(container,
          context,
          container.helpers, container.partials,
          options.data || data,
          blockParams && [options.blockParams].concat(blockParams),
          depths && [context].concat(depths));
    };
    prog.program = i;
    prog.depth = depths ? depths.length : 0;
    prog.blockParams = declaredBlockParams || 0;
    return prog;
  }

  __exports__.program = program;function resolvePartial(partial, context, options) {
    if (!partial) {
      partial = options.partials[options.name];
    } else if (!partial.call && !options.name) {
      // This is a dynamic partial that returned a string
      options.name = partial;
      partial = options.partials[partial];
    }
    return partial;
  }

  __exports__.resolvePartial = resolvePartial;function invokePartial(partial, context, options) {
    options.partial = true;

    if(partial === undefined) {
      throw new Exception("The partial " + options.name + " could not be found");
    } else if(partial instanceof Function) {
      return partial(context, options);
    }
  }

  __exports__.invokePartial = invokePartial;function noop() { return ""; }

  __exports__.noop = noop;function initData(context, data) {
    if (!data || !('root' in data)) {
      data = data ? createFrame(data) : {};
      data.root = context;
    }
    return data;
  }
  return __exports__;
})(__module3__, __module4__, __module2__);

// handlebars.runtime.js
var __module1__ = (function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__) {
  "use strict";
  var __exports__;
  /*globals Handlebars: true */
  var base = __dependency1__;

  // Each of these augment the Handlebars object. No need to setup here.
  // (This is done to easily share code between commonjs and browse envs)
  var SafeString = __dependency2__;
  var Exception = __dependency3__;
  var Utils = __dependency4__;
  var runtime = __dependency5__;

  // For compatibility and usage outside of module systems, make the Handlebars object a namespace
  var create = function() {
    var hb = new base.HandlebarsEnvironment();

    Utils.extend(hb, base);
    hb.SafeString = SafeString;
    hb.Exception = Exception;
    hb.Utils = Utils;
    hb.escapeExpression = Utils.escapeExpression;

    hb.VM = runtime;
    hb.template = function(spec) {
      return runtime.template(spec, hb);
    };

    return hb;
  };

  var Handlebars = create();
  Handlebars.create = create;

  /*jshint -W040 */
  /* istanbul ignore next */
  var root = typeof global !== 'undefined' ? global : window,
      $Handlebars = root.Handlebars;
  /* istanbul ignore next */
  Handlebars.noConflict = function() {
    if (root.Handlebars === Handlebars) {
      root.Handlebars = $Handlebars;
    }
  };

  Handlebars['default'] = Handlebars;

  __exports__ = Handlebars;
  return __exports__;
})(__module2__, __module5__, __module4__, __module3__, __module6__);

// handlebars/compiler/ast.js
var __module7__ = (function() {
  "use strict";
  var __exports__;
  var AST = {
    Program: function(statements, blockParams, strip, locInfo) {
      this.loc = locInfo;
      this.type = 'Program';
      this.body = statements;

      this.blockParams = blockParams;
      this.strip = strip;
    },

    MustacheStatement: function(path, params, hash, escaped, strip, locInfo) {
      this.loc = locInfo;
      this.type = 'MustacheStatement';

      this.path = path;
      this.params = params || [];
      this.hash = hash;
      this.escaped = escaped;

      this.strip = strip;
    },

    BlockStatement: function(path, params, hash, program, inverse, openStrip, inverseStrip, closeStrip, locInfo) {
      this.loc = locInfo;
      this.type = 'BlockStatement';

      this.path = path;
      this.params = params || [];
      this.hash = hash;
      this.program  = program;
      this.inverse  = inverse;

      this.openStrip = openStrip;
      this.inverseStrip = inverseStrip;
      this.closeStrip = closeStrip;
    },

    PartialStatement: function(name, params, hash, strip, locInfo) {
      this.loc = locInfo;
      this.type = 'PartialStatement';

      this.name = name;
      this.params = params || [];
      this.hash = hash;

      this.indent = '';
      this.strip = strip;
    },

    ContentStatement: function(string, locInfo) {
      this.loc = locInfo;
      this.type = 'ContentStatement';
      this.original = this.value = string;
    },

    CommentStatement: function(comment, strip, locInfo) {
      this.loc = locInfo;
      this.type = 'CommentStatement';
      this.value = comment;

      this.strip = strip;
    },

    SubExpression: function(path, params, hash, locInfo) {
      this.loc = locInfo;

      this.type = 'SubExpression';
      this.path = path;
      this.params = params || [];
      this.hash = hash;
    },

    PathExpression: function(data, depth, parts, original, locInfo) {
      this.loc = locInfo;
      this.type = 'PathExpression';

      this.data = data;
      this.original = original;
      this.parts    = parts;
      this.depth    = depth;
    },

    StringLiteral: function(string, locInfo) {
      this.loc = locInfo;
      this.type = 'StringLiteral';
      this.original =
        this.value = string;
    },

    NumberLiteral: function(number, locInfo) {
      this.loc = locInfo;
      this.type = 'NumberLiteral';
      this.original =
        this.value = Number(number);
    },

    BooleanLiteral: function(bool, locInfo) {
      this.loc = locInfo;
      this.type = 'BooleanLiteral';
      this.original =
        this.value = bool === 'true';
    },

    Hash: function(pairs, locInfo) {
      this.loc = locInfo;
      this.type = 'Hash';
      this.pairs = pairs;
    },
    HashPair: function(key, value, locInfo) {
      this.loc = locInfo;
      this.type = 'HashPair';
      this.key = key;
      this.value = value;
    },

    // Public API used to evaluate derived attributes regarding AST nodes
    helpers: {
      // a mustache is definitely a helper if:
      // * it is an eligible helper, and
      // * it has at least one parameter or hash segment
      // TODO: Make these public utility methods
      helperExpression: function(node) {
        return !!(node.type === 'SubExpression' || node.params.length || node.hash);
      },

      scopedId: function(path) {
        return (/^\.|this\b/).test(path.original);
      },

      // an ID is simple if it only has one part, and that part is not
      // `..` or `this`.
      simpleId: function(path) {
        return path.parts.length === 1 && !AST.helpers.scopedId(path) && !path.depth;
      }
    }
  };


  // Must be exported as an object rather than the root of the module as the jison lexer
  // must modify the object to operate properly.
  __exports__ = AST;
  return __exports__;
})();

// handlebars/compiler/parser.js
var __module9__ = (function() {
  "use strict";
  var __exports__;
  /* jshint ignore:start */
  /* istanbul ignore next */
  /* Jison generated parser */
  var handlebars = (function(){
  var parser = {trace: function trace() { },
  yy: {},
  symbols_: {"error":2,"root":3,"program":4,"EOF":5,"program_repetition0":6,"statement":7,"mustache":8,"block":9,"rawBlock":10,"partial":11,"content":12,"COMMENT":13,"CONTENT":14,"openRawBlock":15,"END_RAW_BLOCK":16,"OPEN_RAW_BLOCK":17,"helperName":18,"openRawBlock_repetition0":19,"openRawBlock_option0":20,"CLOSE_RAW_BLOCK":21,"openBlock":22,"block_option0":23,"closeBlock":24,"openInverse":25,"block_option1":26,"OPEN_BLOCK":27,"openBlock_repetition0":28,"openBlock_option0":29,"openBlock_option1":30,"CLOSE":31,"OPEN_INVERSE":32,"openInverse_repetition0":33,"openInverse_option0":34,"openInverse_option1":35,"openInverseChain":36,"OPEN_INVERSE_CHAIN":37,"openInverseChain_repetition0":38,"openInverseChain_option0":39,"openInverseChain_option1":40,"inverseAndProgram":41,"INVERSE":42,"inverseChain":43,"inverseChain_option0":44,"OPEN_ENDBLOCK":45,"OPEN":46,"mustache_repetition0":47,"mustache_option0":48,"OPEN_UNESCAPED":49,"mustache_repetition1":50,"mustache_option1":51,"CLOSE_UNESCAPED":52,"OPEN_PARTIAL":53,"partialName":54,"partial_repetition0":55,"partial_option0":56,"param":57,"sexpr":58,"OPEN_SEXPR":59,"sexpr_repetition0":60,"sexpr_option0":61,"CLOSE_SEXPR":62,"hash":63,"hash_repetition_plus0":64,"hashSegment":65,"ID":66,"EQUALS":67,"blockParams":68,"OPEN_BLOCK_PARAMS":69,"blockParams_repetition_plus0":70,"CLOSE_BLOCK_PARAMS":71,"path":72,"dataName":73,"STRING":74,"NUMBER":75,"BOOLEAN":76,"DATA":77,"pathSegments":78,"SEP":79,"$accept":0,"$end":1},
  terminals_: {2:"error",5:"EOF",13:"COMMENT",14:"CONTENT",16:"END_RAW_BLOCK",17:"OPEN_RAW_BLOCK",21:"CLOSE_RAW_BLOCK",27:"OPEN_BLOCK",31:"CLOSE",32:"OPEN_INVERSE",37:"OPEN_INVERSE_CHAIN",42:"INVERSE",45:"OPEN_ENDBLOCK",46:"OPEN",49:"OPEN_UNESCAPED",52:"CLOSE_UNESCAPED",53:"OPEN_PARTIAL",59:"OPEN_SEXPR",62:"CLOSE_SEXPR",66:"ID",67:"EQUALS",69:"OPEN_BLOCK_PARAMS",71:"CLOSE_BLOCK_PARAMS",74:"STRING",75:"NUMBER",76:"BOOLEAN",77:"DATA",79:"SEP"},
  productions_: [0,[3,2],[4,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[12,1],[10,3],[15,5],[9,4],[9,4],[22,6],[25,6],[36,6],[41,2],[43,3],[43,1],[24,3],[8,5],[8,5],[11,5],[57,1],[57,1],[58,5],[63,1],[65,3],[68,3],[18,1],[18,1],[18,1],[18,1],[18,1],[54,1],[54,1],[73,2],[72,1],[78,3],[78,1],[6,0],[6,2],[19,0],[19,2],[20,0],[20,1],[23,0],[23,1],[26,0],[26,1],[28,0],[28,2],[29,0],[29,1],[30,0],[30,1],[33,0],[33,2],[34,0],[34,1],[35,0],[35,1],[38,0],[38,2],[39,0],[39,1],[40,0],[40,1],[44,0],[44,1],[47,0],[47,2],[48,0],[48,1],[50,0],[50,2],[51,0],[51,1],[55,0],[55,2],[56,0],[56,1],[60,0],[60,2],[61,0],[61,1],[64,1],[64,2],[70,1],[70,2]],
  performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {

  var $0 = $$.length - 1;
  switch (yystate) {
  case 1: return $$[$0-1]; 
  break;
  case 2:this.$ = new yy.Program($$[$0], null, {}, yy.locInfo(this._$));
  break;
  case 3:this.$ = $$[$0];
  break;
  case 4:this.$ = $$[$0];
  break;
  case 5:this.$ = $$[$0];
  break;
  case 6:this.$ = $$[$0];
  break;
  case 7:this.$ = $$[$0];
  break;
  case 8:this.$ = new yy.CommentStatement(yy.stripComment($$[$0]), yy.stripFlags($$[$0], $$[$0]), yy.locInfo(this._$));
  break;
  case 9:this.$ = new yy.ContentStatement($$[$0], yy.locInfo(this._$));
  break;
  case 10:this.$ = yy.prepareRawBlock($$[$0-2], $$[$0-1], $$[$0], this._$);
  break;
  case 11:this.$ = { path: $$[$0-3], params: $$[$0-2], hash: $$[$0-1] };
  break;
  case 12:this.$ = yy.prepareBlock($$[$0-3], $$[$0-2], $$[$0-1], $$[$0], false, this._$);
  break;
  case 13:this.$ = yy.prepareBlock($$[$0-3], $$[$0-2], $$[$0-1], $$[$0], true, this._$);
  break;
  case 14:this.$ = { path: $$[$0-4], params: $$[$0-3], hash: $$[$0-2], blockParams: $$[$0-1], strip: yy.stripFlags($$[$0-5], $$[$0]) };
  break;
  case 15:this.$ = { path: $$[$0-4], params: $$[$0-3], hash: $$[$0-2], blockParams: $$[$0-1], strip: yy.stripFlags($$[$0-5], $$[$0]) };
  break;
  case 16:this.$ = { path: $$[$0-4], params: $$[$0-3], hash: $$[$0-2], blockParams: $$[$0-1], strip: yy.stripFlags($$[$0-5], $$[$0]) };
  break;
  case 17:this.$ = { strip: yy.stripFlags($$[$0-1], $$[$0-1]), program: $$[$0] };
  break;
  case 18:
      var inverse = yy.prepareBlock($$[$0-2], $$[$0-1], $$[$0], $$[$0], false, this._$),
          program = new yy.Program([inverse], null, {}, yy.locInfo(this._$));
      program.chained = true;

      this.$ = { strip: $$[$0-2].strip, program: program, chain: true };
    
  break;
  case 19:this.$ = $$[$0];
  break;
  case 20:this.$ = {path: $$[$0-1], strip: yy.stripFlags($$[$0-2], $$[$0])};
  break;
  case 21:this.$ = yy.prepareMustache($$[$0-3], $$[$0-2], $$[$0-1], $$[$0-4], yy.stripFlags($$[$0-4], $$[$0]), this._$);
  break;
  case 22:this.$ = yy.prepareMustache($$[$0-3], $$[$0-2], $$[$0-1], $$[$0-4], yy.stripFlags($$[$0-4], $$[$0]), this._$);
  break;
  case 23:this.$ = new yy.PartialStatement($$[$0-3], $$[$0-2], $$[$0-1], yy.stripFlags($$[$0-4], $$[$0]), yy.locInfo(this._$));
  break;
  case 24:this.$ = $$[$0];
  break;
  case 25:this.$ = $$[$0];
  break;
  case 26:this.$ = new yy.SubExpression($$[$0-3], $$[$0-2], $$[$0-1], yy.locInfo(this._$));
  break;
  case 27:this.$ = new yy.Hash($$[$0], yy.locInfo(this._$));
  break;
  case 28:this.$ = new yy.HashPair($$[$0-2], $$[$0], yy.locInfo(this._$));
  break;
  case 29:this.$ = $$[$0-1];
  break;
  case 30:this.$ = $$[$0];
  break;
  case 31:this.$ = $$[$0];
  break;
  case 32:this.$ = new yy.StringLiteral($$[$0], yy.locInfo(this._$));
  break;
  case 33:this.$ = new yy.NumberLiteral($$[$0], yy.locInfo(this._$));
  break;
  case 34:this.$ = new yy.BooleanLiteral($$[$0], yy.locInfo(this._$));
  break;
  case 35:this.$ = $$[$0];
  break;
  case 36:this.$ = $$[$0];
  break;
  case 37:this.$ = yy.preparePath(true, $$[$0], this._$);
  break;
  case 38:this.$ = yy.preparePath(false, $$[$0], this._$);
  break;
  case 39: $$[$0-2].push({part: $$[$0], separator: $$[$0-1]}); this.$ = $$[$0-2]; 
  break;
  case 40:this.$ = [{part: $$[$0]}];
  break;
  case 41:this.$ = [];
  break;
  case 42:$$[$0-1].push($$[$0]);
  break;
  case 43:this.$ = [];
  break;
  case 44:$$[$0-1].push($$[$0]);
  break;
  case 51:this.$ = [];
  break;
  case 52:$$[$0-1].push($$[$0]);
  break;
  case 57:this.$ = [];
  break;
  case 58:$$[$0-1].push($$[$0]);
  break;
  case 63:this.$ = [];
  break;
  case 64:$$[$0-1].push($$[$0]);
  break;
  case 71:this.$ = [];
  break;
  case 72:$$[$0-1].push($$[$0]);
  break;
  case 75:this.$ = [];
  break;
  case 76:$$[$0-1].push($$[$0]);
  break;
  case 79:this.$ = [];
  break;
  case 80:$$[$0-1].push($$[$0]);
  break;
  case 83:this.$ = [];
  break;
  case 84:$$[$0-1].push($$[$0]);
  break;
  case 87:this.$ = [$$[$0]];
  break;
  case 88:$$[$0-1].push($$[$0]);
  break;
  case 89:this.$ = [$$[$0]];
  break;
  case 90:$$[$0-1].push($$[$0]);
  break;
  }
  },
  table: [{3:1,4:2,5:[2,41],6:3,13:[2,41],14:[2,41],17:[2,41],27:[2,41],32:[2,41],46:[2,41],49:[2,41],53:[2,41]},{1:[3]},{5:[1,4]},{5:[2,2],7:5,8:6,9:7,10:8,11:9,12:10,13:[1,11],14:[1,18],15:16,17:[1,21],22:14,25:15,27:[1,19],32:[1,20],37:[2,2],42:[2,2],45:[2,2],46:[1,12],49:[1,13],53:[1,17]},{1:[2,1]},{5:[2,42],13:[2,42],14:[2,42],17:[2,42],27:[2,42],32:[2,42],37:[2,42],42:[2,42],45:[2,42],46:[2,42],49:[2,42],53:[2,42]},{5:[2,3],13:[2,3],14:[2,3],17:[2,3],27:[2,3],32:[2,3],37:[2,3],42:[2,3],45:[2,3],46:[2,3],49:[2,3],53:[2,3]},{5:[2,4],13:[2,4],14:[2,4],17:[2,4],27:[2,4],32:[2,4],37:[2,4],42:[2,4],45:[2,4],46:[2,4],49:[2,4],53:[2,4]},{5:[2,5],13:[2,5],14:[2,5],17:[2,5],27:[2,5],32:[2,5],37:[2,5],42:[2,5],45:[2,5],46:[2,5],49:[2,5],53:[2,5]},{5:[2,6],13:[2,6],14:[2,6],17:[2,6],27:[2,6],32:[2,6],37:[2,6],42:[2,6],45:[2,6],46:[2,6],49:[2,6],53:[2,6]},{5:[2,7],13:[2,7],14:[2,7],17:[2,7],27:[2,7],32:[2,7],37:[2,7],42:[2,7],45:[2,7],46:[2,7],49:[2,7],53:[2,7]},{5:[2,8],13:[2,8],14:[2,8],17:[2,8],27:[2,8],32:[2,8],37:[2,8],42:[2,8],45:[2,8],46:[2,8],49:[2,8],53:[2,8]},{18:22,66:[1,30],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{18:31,66:[1,30],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{4:32,6:3,13:[2,41],14:[2,41],17:[2,41],27:[2,41],32:[2,41],37:[2,41],42:[2,41],45:[2,41],46:[2,41],49:[2,41],53:[2,41]},{4:33,6:3,13:[2,41],14:[2,41],17:[2,41],27:[2,41],32:[2,41],42:[2,41],45:[2,41],46:[2,41],49:[2,41],53:[2,41]},{12:34,14:[1,18]},{18:36,54:35,58:37,59:[1,38],66:[1,30],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{5:[2,9],13:[2,9],14:[2,9],16:[2,9],17:[2,9],27:[2,9],32:[2,9],37:[2,9],42:[2,9],45:[2,9],46:[2,9],49:[2,9],53:[2,9]},{18:39,66:[1,30],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{18:40,66:[1,30],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{18:41,66:[1,30],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{31:[2,71],47:42,59:[2,71],66:[2,71],74:[2,71],75:[2,71],76:[2,71],77:[2,71]},{21:[2,30],31:[2,30],52:[2,30],59:[2,30],62:[2,30],66:[2,30],69:[2,30],74:[2,30],75:[2,30],76:[2,30],77:[2,30]},{21:[2,31],31:[2,31],52:[2,31],59:[2,31],62:[2,31],66:[2,31],69:[2,31],74:[2,31],75:[2,31],76:[2,31],77:[2,31]},{21:[2,32],31:[2,32],52:[2,32],59:[2,32],62:[2,32],66:[2,32],69:[2,32],74:[2,32],75:[2,32],76:[2,32],77:[2,32]},{21:[2,33],31:[2,33],52:[2,33],59:[2,33],62:[2,33],66:[2,33],69:[2,33],74:[2,33],75:[2,33],76:[2,33],77:[2,33]},{21:[2,34],31:[2,34],52:[2,34],59:[2,34],62:[2,34],66:[2,34],69:[2,34],74:[2,34],75:[2,34],76:[2,34],77:[2,34]},{21:[2,38],31:[2,38],52:[2,38],59:[2,38],62:[2,38],66:[2,38],69:[2,38],74:[2,38],75:[2,38],76:[2,38],77:[2,38],79:[1,43]},{66:[1,30],78:44},{21:[2,40],31:[2,40],52:[2,40],59:[2,40],62:[2,40],66:[2,40],69:[2,40],74:[2,40],75:[2,40],76:[2,40],77:[2,40],79:[2,40]},{50:45,52:[2,75],59:[2,75],66:[2,75],74:[2,75],75:[2,75],76:[2,75],77:[2,75]},{23:46,36:48,37:[1,50],41:49,42:[1,51],43:47,45:[2,47]},{26:52,41:53,42:[1,51],45:[2,49]},{16:[1,54]},{31:[2,79],55:55,59:[2,79],66:[2,79],74:[2,79],75:[2,79],76:[2,79],77:[2,79]},{31:[2,35],59:[2,35],66:[2,35],74:[2,35],75:[2,35],76:[2,35],77:[2,35]},{31:[2,36],59:[2,36],66:[2,36],74:[2,36],75:[2,36],76:[2,36],77:[2,36]},{18:56,66:[1,30],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{28:57,31:[2,51],59:[2,51],66:[2,51],69:[2,51],74:[2,51],75:[2,51],76:[2,51],77:[2,51]},{31:[2,57],33:58,59:[2,57],66:[2,57],69:[2,57],74:[2,57],75:[2,57],76:[2,57],77:[2,57]},{19:59,21:[2,43],59:[2,43],66:[2,43],74:[2,43],75:[2,43],76:[2,43],77:[2,43]},{18:63,31:[2,73],48:60,57:61,58:64,59:[1,38],63:62,64:65,65:66,66:[1,67],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{66:[1,68]},{21:[2,37],31:[2,37],52:[2,37],59:[2,37],62:[2,37],66:[2,37],69:[2,37],74:[2,37],75:[2,37],76:[2,37],77:[2,37],79:[1,43]},{18:63,51:69,52:[2,77],57:70,58:64,59:[1,38],63:71,64:65,65:66,66:[1,67],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{24:72,45:[1,73]},{45:[2,48]},{4:74,6:3,13:[2,41],14:[2,41],17:[2,41],27:[2,41],32:[2,41],37:[2,41],42:[2,41],45:[2,41],46:[2,41],49:[2,41],53:[2,41]},{45:[2,19]},{18:75,66:[1,30],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{4:76,6:3,13:[2,41],14:[2,41],17:[2,41],27:[2,41],32:[2,41],45:[2,41],46:[2,41],49:[2,41],53:[2,41]},{24:77,45:[1,73]},{45:[2,50]},{5:[2,10],13:[2,10],14:[2,10],17:[2,10],27:[2,10],32:[2,10],37:[2,10],42:[2,10],45:[2,10],46:[2,10],49:[2,10],53:[2,10]},{18:63,31:[2,81],56:78,57:79,58:64,59:[1,38],63:80,64:65,65:66,66:[1,67],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{59:[2,83],60:81,62:[2,83],66:[2,83],74:[2,83],75:[2,83],76:[2,83],77:[2,83]},{18:63,29:82,31:[2,53],57:83,58:64,59:[1,38],63:84,64:65,65:66,66:[1,67],69:[2,53],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{18:63,31:[2,59],34:85,57:86,58:64,59:[1,38],63:87,64:65,65:66,66:[1,67],69:[2,59],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{18:63,20:88,21:[2,45],57:89,58:64,59:[1,38],63:90,64:65,65:66,66:[1,67],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{31:[1,91]},{31:[2,72],59:[2,72],66:[2,72],74:[2,72],75:[2,72],76:[2,72],77:[2,72]},{31:[2,74]},{21:[2,24],31:[2,24],52:[2,24],59:[2,24],62:[2,24],66:[2,24],69:[2,24],74:[2,24],75:[2,24],76:[2,24],77:[2,24]},{21:[2,25],31:[2,25],52:[2,25],59:[2,25],62:[2,25],66:[2,25],69:[2,25],74:[2,25],75:[2,25],76:[2,25],77:[2,25]},{21:[2,27],31:[2,27],52:[2,27],62:[2,27],65:92,66:[1,93],69:[2,27]},{21:[2,87],31:[2,87],52:[2,87],62:[2,87],66:[2,87],69:[2,87]},{21:[2,40],31:[2,40],52:[2,40],59:[2,40],62:[2,40],66:[2,40],67:[1,94],69:[2,40],74:[2,40],75:[2,40],76:[2,40],77:[2,40],79:[2,40]},{21:[2,39],31:[2,39],52:[2,39],59:[2,39],62:[2,39],66:[2,39],69:[2,39],74:[2,39],75:[2,39],76:[2,39],77:[2,39],79:[2,39]},{52:[1,95]},{52:[2,76],59:[2,76],66:[2,76],74:[2,76],75:[2,76],76:[2,76],77:[2,76]},{52:[2,78]},{5:[2,12],13:[2,12],14:[2,12],17:[2,12],27:[2,12],32:[2,12],37:[2,12],42:[2,12],45:[2,12],46:[2,12],49:[2,12],53:[2,12]},{18:96,66:[1,30],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{36:48,37:[1,50],41:49,42:[1,51],43:98,44:97,45:[2,69]},{31:[2,63],38:99,59:[2,63],66:[2,63],69:[2,63],74:[2,63],75:[2,63],76:[2,63],77:[2,63]},{45:[2,17]},{5:[2,13],13:[2,13],14:[2,13],17:[2,13],27:[2,13],32:[2,13],37:[2,13],42:[2,13],45:[2,13],46:[2,13],49:[2,13],53:[2,13]},{31:[1,100]},{31:[2,80],59:[2,80],66:[2,80],74:[2,80],75:[2,80],76:[2,80],77:[2,80]},{31:[2,82]},{18:63,57:102,58:64,59:[1,38],61:101,62:[2,85],63:103,64:65,65:66,66:[1,67],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{30:104,31:[2,55],68:105,69:[1,106]},{31:[2,52],59:[2,52],66:[2,52],69:[2,52],74:[2,52],75:[2,52],76:[2,52],77:[2,52]},{31:[2,54],69:[2,54]},{31:[2,61],35:107,68:108,69:[1,106]},{31:[2,58],59:[2,58],66:[2,58],69:[2,58],74:[2,58],75:[2,58],76:[2,58],77:[2,58]},{31:[2,60],69:[2,60]},{21:[1,109]},{21:[2,44],59:[2,44],66:[2,44],74:[2,44],75:[2,44],76:[2,44],77:[2,44]},{21:[2,46]},{5:[2,21],13:[2,21],14:[2,21],17:[2,21],27:[2,21],32:[2,21],37:[2,21],42:[2,21],45:[2,21],46:[2,21],49:[2,21],53:[2,21]},{21:[2,88],31:[2,88],52:[2,88],62:[2,88],66:[2,88],69:[2,88]},{67:[1,94]},{18:63,57:110,58:64,59:[1,38],66:[1,30],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{5:[2,22],13:[2,22],14:[2,22],17:[2,22],27:[2,22],32:[2,22],37:[2,22],42:[2,22],45:[2,22],46:[2,22],49:[2,22],53:[2,22]},{31:[1,111]},{45:[2,18]},{45:[2,70]},{18:63,31:[2,65],39:112,57:113,58:64,59:[1,38],63:114,64:65,65:66,66:[1,67],69:[2,65],72:23,73:24,74:[1,25],75:[1,26],76:[1,27],77:[1,29],78:28},{5:[2,23],13:[2,23],14:[2,23],17:[2,23],27:[2,23],32:[2,23],37:[2,23],42:[2,23],45:[2,23],46:[2,23],49:[2,23],53:[2,23]},{62:[1,115]},{59:[2,84],62:[2,84],66:[2,84],74:[2,84],75:[2,84],76:[2,84],77:[2,84]},{62:[2,86]},{31:[1,116]},{31:[2,56]},{66:[1,118],70:117},{31:[1,119]},{31:[2,62]},{14:[2,11]},{21:[2,28],31:[2,28],52:[2,28],62:[2,28],66:[2,28],69:[2,28]},{5:[2,20],13:[2,20],14:[2,20],17:[2,20],27:[2,20],32:[2,20],37:[2,20],42:[2,20],45:[2,20],46:[2,20],49:[2,20],53:[2,20]},{31:[2,67],40:120,68:121,69:[1,106]},{31:[2,64],59:[2,64],66:[2,64],69:[2,64],74:[2,64],75:[2,64],76:[2,64],77:[2,64]},{31:[2,66],69:[2,66]},{21:[2,26],31:[2,26],52:[2,26],59:[2,26],62:[2,26],66:[2,26],69:[2,26],74:[2,26],75:[2,26],76:[2,26],77:[2,26]},{13:[2,14],14:[2,14],17:[2,14],27:[2,14],32:[2,14],37:[2,14],42:[2,14],45:[2,14],46:[2,14],49:[2,14],53:[2,14]},{66:[1,123],71:[1,122]},{66:[2,89],71:[2,89]},{13:[2,15],14:[2,15],17:[2,15],27:[2,15],32:[2,15],42:[2,15],45:[2,15],46:[2,15],49:[2,15],53:[2,15]},{31:[1,124]},{31:[2,68]},{31:[2,29]},{66:[2,90],71:[2,90]},{13:[2,16],14:[2,16],17:[2,16],27:[2,16],32:[2,16],37:[2,16],42:[2,16],45:[2,16],46:[2,16],49:[2,16],53:[2,16]}],
  defaultActions: {4:[2,1],47:[2,48],49:[2,19],53:[2,50],62:[2,74],71:[2,78],76:[2,17],80:[2,82],90:[2,46],97:[2,18],98:[2,70],103:[2,86],105:[2,56],108:[2,62],109:[2,11],121:[2,68],122:[2,29]},
  parseError: function parseError(str, hash) {
      throw new Error(str);
  },
  parse: function parse(input) {
      var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
      this.lexer.setInput(input);
      this.lexer.yy = this.yy;
      this.yy.lexer = this.lexer;
      this.yy.parser = this;
      if (typeof this.lexer.yylloc == "undefined")
          this.lexer.yylloc = {};
      var yyloc = this.lexer.yylloc;
      lstack.push(yyloc);
      var ranges = this.lexer.options && this.lexer.options.ranges;
      if (typeof this.yy.parseError === "function")
          this.parseError = this.yy.parseError;
      function popStack(n) {
          stack.length = stack.length - 2 * n;
          vstack.length = vstack.length - n;
          lstack.length = lstack.length - n;
      }
      function lex() {
          var token;
          token = self.lexer.lex() || 1;
          if (typeof token !== "number") {
              token = self.symbols_[token] || token;
          }
          return token;
      }
      var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
      while (true) {
          state = stack[stack.length - 1];
          if (this.defaultActions[state]) {
              action = this.defaultActions[state];
          } else {
              if (symbol === null || typeof symbol == "undefined") {
                  symbol = lex();
              }
              action = table[state] && table[state][symbol];
          }
          if (typeof action === "undefined" || !action.length || !action[0]) {
              var errStr = "";
              if (!recovering) {
                  expected = [];
                  for (p in table[state])
                      if (this.terminals_[p] && p > 2) {
                          expected.push("'" + this.terminals_[p] + "'");
                      }
                  if (this.lexer.showPosition) {
                      errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                  } else {
                      errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1?"end of input":"'" + (this.terminals_[symbol] || symbol) + "'");
                  }
                  this.parseError(errStr, {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected});
              }
          }
          if (action[0] instanceof Array && action.length > 1) {
              throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
          }
          switch (action[0]) {
          case 1:
              stack.push(symbol);
              vstack.push(this.lexer.yytext);
              lstack.push(this.lexer.yylloc);
              stack.push(action[1]);
              symbol = null;
              if (!preErrorSymbol) {
                  yyleng = this.lexer.yyleng;
                  yytext = this.lexer.yytext;
                  yylineno = this.lexer.yylineno;
                  yyloc = this.lexer.yylloc;
                  if (recovering > 0)
                      recovering--;
              } else {
                  symbol = preErrorSymbol;
                  preErrorSymbol = null;
              }
              break;
          case 2:
              len = this.productions_[action[1]][1];
              yyval.$ = vstack[vstack.length - len];
              yyval._$ = {first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column};
              if (ranges) {
                  yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
              }
              r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
              if (typeof r !== "undefined") {
                  return r;
              }
              if (len) {
                  stack = stack.slice(0, -1 * len * 2);
                  vstack = vstack.slice(0, -1 * len);
                  lstack = lstack.slice(0, -1 * len);
              }
              stack.push(this.productions_[action[1]][0]);
              vstack.push(yyval.$);
              lstack.push(yyval._$);
              newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
              stack.push(newState);
              break;
          case 3:
              return true;
          }
      }
      return true;
  }
  };
  /* Jison generated lexer */
  var lexer = (function(){
  var lexer = ({EOF:1,
  parseError:function parseError(str, hash) {
          if (this.yy.parser) {
              this.yy.parser.parseError(str, hash);
          } else {
              throw new Error(str);
          }
      },
  setInput:function (input) {
          this._input = input;
          this._more = this._less = this.done = false;
          this.yylineno = this.yyleng = 0;
          this.yytext = this.matched = this.match = '';
          this.conditionStack = ['INITIAL'];
          this.yylloc = {first_line:1,first_column:0,last_line:1,last_column:0};
          if (this.options.ranges) this.yylloc.range = [0,0];
          this.offset = 0;
          return this;
      },
  input:function () {
          var ch = this._input[0];
          this.yytext += ch;
          this.yyleng++;
          this.offset++;
          this.match += ch;
          this.matched += ch;
          var lines = ch.match(/(?:\r\n?|\n).*/g);
          if (lines) {
              this.yylineno++;
              this.yylloc.last_line++;
          } else {
              this.yylloc.last_column++;
          }
          if (this.options.ranges) this.yylloc.range[1]++;

          this._input = this._input.slice(1);
          return ch;
      },
  unput:function (ch) {
          var len = ch.length;
          var lines = ch.split(/(?:\r\n?|\n)/g);

          this._input = ch + this._input;
          this.yytext = this.yytext.substr(0, this.yytext.length-len-1);
          //this.yyleng -= len;
          this.offset -= len;
          var oldLines = this.match.split(/(?:\r\n?|\n)/g);
          this.match = this.match.substr(0, this.match.length-1);
          this.matched = this.matched.substr(0, this.matched.length-1);

          if (lines.length-1) this.yylineno -= lines.length-1;
          var r = this.yylloc.range;

          this.yylloc = {first_line: this.yylloc.first_line,
            last_line: this.yylineno+1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length:
                this.yylloc.first_column - len
            };

          if (this.options.ranges) {
              this.yylloc.range = [r[0], r[0] + this.yyleng - len];
          }
          return this;
      },
  more:function () {
          this._more = true;
          return this;
      },
  less:function (n) {
          this.unput(this.match.slice(n));
      },
  pastInput:function () {
          var past = this.matched.substr(0, this.matched.length - this.match.length);
          return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
      },
  upcomingInput:function () {
          var next = this.match;
          if (next.length < 20) {
              next += this._input.substr(0, 20-next.length);
          }
          return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
      },
  showPosition:function () {
          var pre = this.pastInput();
          var c = new Array(pre.length + 1).join("-");
          return pre + this.upcomingInput() + "\n" + c+"^";
      },
  next:function () {
          if (this.done) {
              return this.EOF;
          }
          if (!this._input) this.done = true;

          var token,
              match,
              tempMatch,
              index,
              col,
              lines;
          if (!this._more) {
              this.yytext = '';
              this.match = '';
          }
          var rules = this._currentRules();
          for (var i=0;i < rules.length; i++) {
              tempMatch = this._input.match(this.rules[rules[i]]);
              if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                  match = tempMatch;
                  index = i;
                  if (!this.options.flex) break;
              }
          }
          if (match) {
              lines = match[0].match(/(?:\r\n?|\n).*/g);
              if (lines) this.yylineno += lines.length;
              this.yylloc = {first_line: this.yylloc.last_line,
                             last_line: this.yylineno+1,
                             first_column: this.yylloc.last_column,
                             last_column: lines ? lines[lines.length-1].length-lines[lines.length-1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length};
              this.yytext += match[0];
              this.match += match[0];
              this.matches = match;
              this.yyleng = this.yytext.length;
              if (this.options.ranges) {
                  this.yylloc.range = [this.offset, this.offset += this.yyleng];
              }
              this._more = false;
              this._input = this._input.slice(match[0].length);
              this.matched += match[0];
              token = this.performAction.call(this, this.yy, this, rules[index],this.conditionStack[this.conditionStack.length-1]);
              if (this.done && this._input) this.done = false;
              if (token) return token;
              else return;
          }
          if (this._input === "") {
              return this.EOF;
          } else {
              return this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(),
                      {text: "", token: null, line: this.yylineno});
          }
      },
  lex:function lex() {
          var r = this.next();
          if (typeof r !== 'undefined') {
              return r;
          } else {
              return this.lex();
          }
      },
  begin:function begin(condition) {
          this.conditionStack.push(condition);
      },
  popState:function popState() {
          return this.conditionStack.pop();
      },
  _currentRules:function _currentRules() {
          return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules;
      },
  topState:function () {
          return this.conditionStack[this.conditionStack.length-2];
      },
  pushState:function begin(condition) {
          this.begin(condition);
      }});
  lexer.options = {};
  lexer.performAction = function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {


  function strip(start, end) {
    return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng-end);
  }


  var YYSTATE=YY_START
  switch($avoiding_name_collisions) {
  case 0:
                                     if(yy_.yytext.slice(-2) === "\\\\") {
                                       strip(0,1);
                                       this.begin("mu");
                                     } else if(yy_.yytext.slice(-1) === "\\") {
                                       strip(0,1);
                                       this.begin("emu");
                                     } else {
                                       this.begin("mu");
                                     }
                                     if(yy_.yytext) return 14;
                                   
  break;
  case 1:return 14;
  break;
  case 2:
                                     this.popState();
                                     return 14;
                                   
  break;
  case 3:
                                    yy_.yytext = yy_.yytext.substr(5, yy_.yyleng-9);
                                    this.popState();
                                    return 16;
                                   
  break;
  case 4: return 14; 
  break;
  case 5:
    this.popState();
    return 13;

  break;
  case 6:return 59;
  break;
  case 7:return 62;
  break;
  case 8: return 17; 
  break;
  case 9:
                                    this.popState();
                                    this.begin('raw');
                                    return 21;
                                   
  break;
  case 10:return 53;
  break;
  case 11:return 27;
  break;
  case 12:return 45;
  break;
  case 13:this.popState(); return 42;
  break;
  case 14:this.popState(); return 42;
  break;
  case 15:return 32;
  break;
  case 16:return 37;
  break;
  case 17:return 49;
  break;
  case 18:return 46;
  break;
  case 19:
    this.unput(yy_.yytext);
    this.popState();
    this.begin('com');

  break;
  case 20:
    this.popState();
    return 13;

  break;
  case 21:return 46;
  break;
  case 22:return 67;
  break;
  case 23:return 66;
  break;
  case 24:return 66;
  break;
  case 25:return 79;
  break;
  case 26:// ignore whitespace
  break;
  case 27:this.popState(); return 52;
  break;
  case 28:this.popState(); return 31;
  break;
  case 29:yy_.yytext = strip(1,2).replace(/\\"/g,'"'); return 74;
  break;
  case 30:yy_.yytext = strip(1,2).replace(/\\'/g,"'"); return 74;
  break;
  case 31:return 77;
  break;
  case 32:return 76;
  break;
  case 33:return 76;
  break;
  case 34:return 75;
  break;
  case 35:return 69;
  break;
  case 36:return 71;
  break;
  case 37:return 66;
  break;
  case 38:yy_.yytext = strip(1,2); return 66;
  break;
  case 39:return 'INVALID';
  break;
  case 40:return 5;
  break;
  }
  };
  lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/,/^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/,/^(?:[^\x00]*?(?=(\{\{\{\{\/)))/,/^(?:[\s\S]*?--(~)?\}\})/,/^(?:\()/,/^(?:\))/,/^(?:\{\{\{\{)/,/^(?:\}\}\}\})/,/^(?:\{\{(~)?>)/,/^(?:\{\{(~)?#)/,/^(?:\{\{(~)?\/)/,/^(?:\{\{(~)?\^\s*(~)?\}\})/,/^(?:\{\{(~)?\s*else\s*(~)?\}\})/,/^(?:\{\{(~)?\^)/,/^(?:\{\{(~)?\s*else\b)/,/^(?:\{\{(~)?\{)/,/^(?:\{\{(~)?&)/,/^(?:\{\{(~)?!--)/,/^(?:\{\{(~)?![\s\S]*?\}\})/,/^(?:\{\{(~)?)/,/^(?:=)/,/^(?:\.\.)/,/^(?:\.(?=([=~}\s\/.)|])))/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}(~)?\}\})/,/^(?:(~)?\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@)/,/^(?:true(?=([~}\s)])))/,/^(?:false(?=([~}\s)])))/,/^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/,/^(?:as\s+\|)/,/^(?:\|)/,/^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)|]))))/,/^(?:\[[^\]]*\])/,/^(?:.)/,/^(?:$)/];
  lexer.conditions = {"mu":{"rules":[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40],"inclusive":false},"emu":{"rules":[2],"inclusive":false},"com":{"rules":[5],"inclusive":false},"raw":{"rules":[3,4],"inclusive":false},"INITIAL":{"rules":[0,1,40],"inclusive":true}};
  return lexer;})()
  parser.lexer = lexer;
  function Parser () { this.yy = {}; }Parser.prototype = parser;parser.Parser = Parser;
  return new Parser;
  })();__exports__ = handlebars;
  /* jshint ignore:end */
  return __exports__;
})();

// handlebars/compiler/visitor.js
var __module11__ = (function(__dependency1__, __dependency2__) {
  "use strict";
  var __exports__;
  var Exception = __dependency1__;
  var AST = __dependency2__;

  function Visitor() {
    this.parents = [];
  }

  Visitor.prototype = {
    constructor: Visitor,
    mutating: false,

    // Visits a given value. If mutating, will replace the value if necessary.
    acceptKey: function(node, name) {
      var value = this.accept(node[name]);
      if (this.mutating) {
        // Hacky sanity check:
        if (value && (!value.type || !AST[value.type])) {
          throw new Exception('Unexpected node type "' + value.type + '" found when accepting ' + name + ' on ' + node.type);
        }
        node[name] = value;
      }
    },

    // Performs an accept operation with added sanity check to ensure
    // required keys are not removed.
    acceptRequired: function(node, name) {
      this.acceptKey(node, name);

      if (!node[name]) {
        throw new Exception(node.type + ' requires ' + name);
      }
    },

    // Traverses a given array. If mutating, empty respnses will be removed
    // for child elements.
    acceptArray: function(array) {
      for (var i = 0, l = array.length; i < l; i++) {
        this.acceptKey(array, i);

        if (!array[i]) {
          array.splice(i, 1);
          i--;
          l--;
        }
      }
    },

    accept: function(object) {
      if (!object) {
        return;
      }

      if (this.current) {
        this.parents.unshift(this.current);
      }
      this.current = object;

      var ret = this[object.type](object);

      this.current = this.parents.shift();

      if (!this.mutating || ret) {
        return ret;
      } else if (ret !== false) {
        return object;
      }
    },

    Program: function(program) {
      this.acceptArray(program.body);
    },

    MustacheStatement: function(mustache) {
      this.acceptRequired(mustache, 'path');
      this.acceptArray(mustache.params);
      this.acceptKey(mustache, 'hash');
    },

    BlockStatement: function(block) {
      this.acceptRequired(block, 'path');
      this.acceptArray(block.params);
      this.acceptKey(block, 'hash');

      this.acceptKey(block, 'program');
      this.acceptKey(block, 'inverse');
    },

    PartialStatement: function(partial) {
      this.acceptRequired(partial, 'name');
      this.acceptArray(partial.params);
      this.acceptKey(partial, 'hash');
    },

    ContentStatement: function(/* content */) {},
    CommentStatement: function(/* comment */) {},

    SubExpression: function(sexpr) {
      this.acceptRequired(sexpr, 'path');
      this.acceptArray(sexpr.params);
      this.acceptKey(sexpr, 'hash');
    },
    PartialExpression: function(partial) {
      this.acceptRequired(partial, 'name');
      this.acceptArray(partial.params);
      this.acceptKey(partial, 'hash');
    },

    PathExpression: function(/* path */) {},

    StringLiteral: function(/* string */) {},
    NumberLiteral: function(/* number */) {},
    BooleanLiteral: function(/* bool */) {},

    Hash: function(hash) {
      this.acceptArray(hash.pairs);
    },
    HashPair: function(pair) {
      this.acceptRequired(pair, 'value');
    }
  };

  __exports__ = Visitor;
  return __exports__;
})(__module4__, __module7__);

// handlebars/compiler/whitespace-control.js
var __module10__ = (function(__dependency1__) {
  "use strict";
  var __exports__;
  var Visitor = __dependency1__;

  function WhitespaceControl() {
  }
  WhitespaceControl.prototype = new Visitor();

  WhitespaceControl.prototype.Program = function(program) {
    var isRoot = !this.isRootSeen;
    this.isRootSeen = true;

    var body = program.body;
    for (var i = 0, l = body.length; i < l; i++) {
      var current = body[i],
          strip = this.accept(current);

      if (!strip) {
        continue;
      }

      var _isPrevWhitespace = isPrevWhitespace(body, i, isRoot),
          _isNextWhitespace = isNextWhitespace(body, i, isRoot),

          openStandalone = strip.openStandalone && _isPrevWhitespace,
          closeStandalone = strip.closeStandalone && _isNextWhitespace,
          inlineStandalone = strip.inlineStandalone && _isPrevWhitespace && _isNextWhitespace;

      if (strip.close) {
        omitRight(body, i, true);
      }
      if (strip.open) {
        omitLeft(body, i, true);
      }

      if (inlineStandalone) {
        omitRight(body, i);

        if (omitLeft(body, i)) {
          // If we are on a standalone node, save the indent info for partials
          if (current.type === 'PartialStatement') {
            // Pull out the whitespace from the final line
            current.indent = (/([ \t]+$)/).exec(body[i-1].original)[1];
          }
        }
      }
      if (openStandalone) {
        omitRight((current.program || current.inverse).body);

        // Strip out the previous content node if it's whitespace only
        omitLeft(body, i);
      }
      if (closeStandalone) {
        // Always strip the next node
        omitRight(body, i);

        omitLeft((current.inverse || current.program).body);
      }
    }

    return program;
  };
  WhitespaceControl.prototype.BlockStatement = function(block) {
    this.accept(block.program);
    this.accept(block.inverse);

    // Find the inverse program that is involed with whitespace stripping.
    var program = block.program || block.inverse,
        inverse = block.program && block.inverse,
        firstInverse = inverse,
        lastInverse = inverse;

    if (inverse && inverse.chained) {
      firstInverse = inverse.body[0].program;

      // Walk the inverse chain to find the last inverse that is actually in the chain.
      while (lastInverse.chained) {
        lastInverse = lastInverse.body[lastInverse.body.length-1].program;
      }
    }

    var strip = {
      open: block.openStrip.open,
      close: block.closeStrip.close,

      // Determine the standalone candiacy. Basically flag our content as being possibly standalone
      // so our parent can determine if we actually are standalone
      openStandalone: isNextWhitespace(program.body),
      closeStandalone: isPrevWhitespace((firstInverse || program).body)
    };

    if (block.openStrip.close) {
      omitRight(program.body, null, true);
    }

    if (inverse) {
      var inverseStrip = block.inverseStrip;

      if (inverseStrip.open) {
        omitLeft(program.body, null, true);
      }

      if (inverseStrip.close) {
        omitRight(firstInverse.body, null, true);
      }
      if (block.closeStrip.open) {
        omitLeft(lastInverse.body, null, true);
      }

      // Find standalone else statments
      if (isPrevWhitespace(program.body)
          && isNextWhitespace(firstInverse.body)) {

        omitLeft(program.body);
        omitRight(firstInverse.body);
      }
    } else {
      if (block.closeStrip.open) {
        omitLeft(program.body, null, true);
      }
    }

    return strip;
  };

  WhitespaceControl.prototype.MustacheStatement = function(mustache) {
    return mustache.strip;
  };

  WhitespaceControl.prototype.PartialStatement = 
      WhitespaceControl.prototype.CommentStatement = function(node) {
    /* istanbul ignore next */
    var strip = node.strip || {};
    return {
      inlineStandalone: true,
      open: strip.open,
      close: strip.close
    };
  };


  function isPrevWhitespace(body, i, isRoot) {
    if (i === undefined) {
      i = body.length;
    }

    // Nodes that end with newlines are considered whitespace (but are special
    // cased for strip operations)
    var prev = body[i-1],
        sibling = body[i-2];
    if (!prev) {
      return isRoot;
    }

    if (prev.type === 'ContentStatement') {
      return (sibling || !isRoot ? (/\r?\n\s*?$/) : (/(^|\r?\n)\s*?$/)).test(prev.original);
    }
  }
  function isNextWhitespace(body, i, isRoot) {
    if (i === undefined) {
      i = -1;
    }

    var next = body[i+1],
        sibling = body[i+2];
    if (!next) {
      return isRoot;
    }

    if (next.type === 'ContentStatement') {
      return (sibling || !isRoot ? (/^\s*?\r?\n/) : (/^\s*?(\r?\n|$)/)).test(next.original);
    }
  }

  // Marks the node to the right of the position as omitted.
  // I.e. {{foo}}' ' will mark the ' ' node as omitted.
  //
  // If i is undefined, then the first child will be marked as such.
  //
  // If mulitple is truthy then all whitespace will be stripped out until non-whitespace
  // content is met.
  function omitRight(body, i, multiple) {
    var current = body[i == null ? 0 : i + 1];
    if (!current || current.type !== 'ContentStatement' || (!multiple && current.rightStripped)) {
      return;
    }

    var original = current.value;
    current.value = current.value.replace(multiple ? (/^\s+/) : (/^[ \t]*\r?\n?/), '');
    current.rightStripped = current.value !== original;
  }

  // Marks the node to the left of the position as omitted.
  // I.e. ' '{{foo}} will mark the ' ' node as omitted.
  //
  // If i is undefined then the last child will be marked as such.
  //
  // If mulitple is truthy then all whitespace will be stripped out until non-whitespace
  // content is met.
  function omitLeft(body, i, multiple) {
    var current = body[i == null ? body.length - 1 : i - 1];
    if (!current || current.type !== 'ContentStatement' || (!multiple && current.leftStripped)) {
      return;
    }

    // We omit the last node if it's whitespace only and not preceeded by a non-content node.
    var original = current.value;
    current.value = current.value.replace(multiple ? (/\s+$/) : (/[ \t]+$/), '');
    current.leftStripped = current.value !== original;
    return current.leftStripped;
  }

  __exports__ = WhitespaceControl;
  return __exports__;
})(__module11__);

// handlebars/compiler/helpers.js
var __module12__ = (function(__dependency1__) {
  "use strict";
  var __exports__ = {};
  var Exception = __dependency1__;

  function SourceLocation(source, locInfo) {
    this.source = source;
    this.start = {
      line: locInfo.first_line,
      column: locInfo.first_column
    };
    this.end = {
      line: locInfo.last_line,
      column: locInfo.last_column
    };
  }

  __exports__.SourceLocation = SourceLocation;function stripFlags(open, close) {
    return {
      open: open.charAt(2) === '~',
      close: close.charAt(close.length-3) === '~'
    };
  }

  __exports__.stripFlags = stripFlags;function stripComment(comment) {
    return comment.replace(/^\{\{~?\!-?-?/, '')
                  .replace(/-?-?~?\}\}$/, '');
  }

  __exports__.stripComment = stripComment;function preparePath(data, parts, locInfo) {
    /*jshint -W040 */
    locInfo = this.locInfo(locInfo);

    var original = data ? '@' : '',
        dig = [],
        depth = 0,
        depthString = '';

    for(var i=0,l=parts.length; i<l; i++) {
      var part = parts[i].part;
      original += (parts[i].separator || '') + part;

      if (part === '..' || part === '.' || part === 'this') {
        if (dig.length > 0) {
          throw new Exception('Invalid path: ' + original, {loc: locInfo});
        } else if (part === '..') {
          depth++;
          depthString += '../';
        }
      } else {
        dig.push(part);
      }
    }

    return new this.PathExpression(data, depth, dig, original, locInfo);
  }

  __exports__.preparePath = preparePath;function prepareMustache(path, params, hash, open, strip, locInfo) {
    /*jshint -W040 */
    // Must use charAt to support IE pre-10
    var escapeFlag = open.charAt(3) || open.charAt(2),
        escaped = escapeFlag !== '{' && escapeFlag !== '&';

    return new this.MustacheStatement(path, params, hash, escaped, strip, this.locInfo(locInfo));
  }

  __exports__.prepareMustache = prepareMustache;function prepareRawBlock(openRawBlock, content, close, locInfo) {
    /*jshint -W040 */
    if (openRawBlock.path.original !== close) {
      var errorNode = {loc: openRawBlock.path.loc};

      throw new Exception(openRawBlock.path.original + " doesn't match " + close, errorNode);
    }

    locInfo = this.locInfo(locInfo);
    var program = new this.Program([content], null, {}, locInfo);

    return new this.BlockStatement(
        openRawBlock.path, openRawBlock.params, openRawBlock.hash,
        program, undefined,
        {}, {}, {},
        locInfo);
  }

  __exports__.prepareRawBlock = prepareRawBlock;function prepareBlock(openBlock, program, inverseAndProgram, close, inverted, locInfo) {
    /*jshint -W040 */
    // When we are chaining inverse calls, we will not have a close path
    if (close && close.path && openBlock.path.original !== close.path.original) {
      var errorNode = {loc: openBlock.path.loc};

      throw new Exception(openBlock.path.original + ' doesn\'t match ' + close.path.original, errorNode);
    }

    program.blockParams = openBlock.blockParams;

    var inverse,
        inverseStrip;

    if (inverseAndProgram) {
      if (inverseAndProgram.chain) {
        inverseAndProgram.program.body[0].closeStrip = close.strip;
      }

      inverseStrip = inverseAndProgram.strip;
      inverse = inverseAndProgram.program;
    }

    if (inverted) {
      inverted = inverse;
      inverse = program;
      program = inverted;
    }

    return new this.BlockStatement(
        openBlock.path, openBlock.params, openBlock.hash,
        program, inverse,
        openBlock.strip, inverseStrip, close && close.strip,
        this.locInfo(locInfo));
  }

  __exports__.prepareBlock = prepareBlock;
  return __exports__;
})(__module4__);

// handlebars/compiler/base.js
var __module8__ = (function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__) {
  "use strict";
  var __exports__ = {};
  var parser = __dependency1__;
  var AST = __dependency2__;
  var WhitespaceControl = __dependency3__;
  var Helpers = __dependency4__;
  var extend = __dependency5__.extend;

  __exports__.parser = parser;

  var yy = {};
  extend(yy, Helpers, AST);

  function parse(input, options) {
    // Just return if an already-compiled AST was passed in.
    if (input.type === 'Program') { return input; }

    parser.yy = yy;

    // Altering the shared object here, but this is ok as parser is a sync operation
    yy.locInfo = function(locInfo) {
      return new yy.SourceLocation(options && options.srcName, locInfo);
    };

    var strip = new WhitespaceControl();
    return strip.accept(parser.parse(input));
  }

  __exports__.parse = parse;
  return __exports__;
})(__module9__, __module7__, __module10__, __module12__, __module3__);

// handlebars/compiler/compiler.js
var __module13__ = (function(__dependency1__, __dependency2__, __dependency3__) {
  "use strict";
  var __exports__ = {};
  var Exception = __dependency1__;
  var isArray = __dependency2__.isArray;
  var indexOf = __dependency2__.indexOf;
  var AST = __dependency3__;

  var slice = [].slice;


  function Compiler() {}

  __exports__.Compiler = Compiler;// the foundHelper register will disambiguate helper lookup from finding a
  // function in a context. This is necessary for mustache compatibility, which
  // requires that context functions in blocks are evaluated by blockHelperMissing,
  // and then proceed as if the resulting value was provided to blockHelperMissing.

  Compiler.prototype = {
    compiler: Compiler,

    equals: function(other) {
      var len = this.opcodes.length;
      if (other.opcodes.length !== len) {
        return false;
      }

      for (var i = 0; i < len; i++) {
        var opcode = this.opcodes[i],
            otherOpcode = other.opcodes[i];
        if (opcode.opcode !== otherOpcode.opcode || !argEquals(opcode.args, otherOpcode.args)) {
          return false;
        }
      }

      // We know that length is the same between the two arrays because they are directly tied
      // to the opcode behavior above.
      len = this.children.length;
      for (i = 0; i < len; i++) {
        if (!this.children[i].equals(other.children[i])) {
          return false;
        }
      }

      return true;
    },

    guid: 0,

    compile: function(program, options) {
      this.sourceNode = [];
      this.opcodes = [];
      this.children = [];
      this.options = options;
      this.stringParams = options.stringParams;
      this.trackIds = options.trackIds;

      options.blockParams = options.blockParams || [];

      // These changes will propagate to the other compiler components
      var knownHelpers = options.knownHelpers;
      options.knownHelpers = {
        'helperMissing': true,
        'blockHelperMissing': true,
        'each': true,
        'if': true,
        'unless': true,
        'with': true,
        'log': true,
        'lookup': true
      };
      if (knownHelpers) {
        for (var name in knownHelpers) {
          options.knownHelpers[name] = knownHelpers[name];
        }
      }

      return this.accept(program);
    },

    compileProgram: function(program) {
      var result = new this.compiler().compile(program, this.options);
      var guid = this.guid++;

      this.usePartial = this.usePartial || result.usePartial;

      this.children[guid] = result;
      this.useDepths = this.useDepths || result.useDepths;

      return guid;
    },

    accept: function(node) {
      this.sourceNode.unshift(node);
      var ret = this[node.type](node);
      this.sourceNode.shift();
      return ret;
    },

    Program: function(program) {
      this.options.blockParams.unshift(program.blockParams);

      var body = program.body;
      for(var i=0, l=body.length; i<l; i++) {
        this.accept(body[i]);
      }

      this.options.blockParams.shift();

      this.isSimple = l === 1;
      this.blockParams = program.blockParams ? program.blockParams.length : 0;

      return this;
    },

    BlockStatement: function(block) {
      transformLiteralToPath(block);

      var program = block.program,
          inverse = block.inverse;

      program = program && this.compileProgram(program);
      inverse = inverse && this.compileProgram(inverse);

      var type = this.classifySexpr(block);

      if (type === 'helper') {
        this.helperSexpr(block, program, inverse);
      } else if (type === 'simple') {
        this.simpleSexpr(block);

        // now that the simple mustache is resolved, we need to
        // evaluate it by executing `blockHelperMissing`
        this.opcode('pushProgram', program);
        this.opcode('pushProgram', inverse);
        this.opcode('emptyHash');
        this.opcode('blockValue', block.path.original);
      } else {
        this.ambiguousSexpr(block, program, inverse);

        // now that the simple mustache is resolved, we need to
        // evaluate it by executing `blockHelperMissing`
        this.opcode('pushProgram', program);
        this.opcode('pushProgram', inverse);
        this.opcode('emptyHash');
        this.opcode('ambiguousBlockValue');
      }

      this.opcode('append');
    },

    PartialStatement: function(partial) {
      this.usePartial = true;

      var params = partial.params;
      if (params.length > 1) {
        throw new Exception('Unsupported number of partial arguments: ' + params.length, partial);
      } else if (!params.length) {
        params.push({type: 'PathExpression', parts: [], depth: 0});
      }

      var partialName = partial.name.original,
          isDynamic = partial.name.type === 'SubExpression';
      if (isDynamic) {
        this.accept(partial.name);
      }

      this.setupFullMustacheParams(partial, undefined, undefined, true);

      var indent = partial.indent || '';
      if (this.options.preventIndent && indent) {
        this.opcode('appendContent', indent);
        indent = '';
      }

      this.opcode('invokePartial', isDynamic, partialName, indent);
      this.opcode('append');
    },

    MustacheStatement: function(mustache) {
      this.SubExpression(mustache);

      if(mustache.escaped && !this.options.noEscape) {
        this.opcode('appendEscaped');
      } else {
        this.opcode('append');
      }
    },

    ContentStatement: function(content) {
      if (content.value) {
        this.opcode('appendContent', content.value);
      }
    },

    CommentStatement: function() {},

    SubExpression: function(sexpr) {
      transformLiteralToPath(sexpr);
      var type = this.classifySexpr(sexpr);

      if (type === 'simple') {
        this.simpleSexpr(sexpr);
      } else if (type === 'helper') {
        this.helperSexpr(sexpr);
      } else {
        this.ambiguousSexpr(sexpr);
      }
    },
    ambiguousSexpr: function(sexpr, program, inverse) {
      var path = sexpr.path,
          name = path.parts[0],
          isBlock = program != null || inverse != null;

      this.opcode('getContext', path.depth);

      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);

      this.accept(path);

      this.opcode('invokeAmbiguous', name, isBlock);
    },

    simpleSexpr: function(sexpr) {
      this.accept(sexpr.path);
      this.opcode('resolvePossibleLambda');
    },

    helperSexpr: function(sexpr, program, inverse) {
      var params = this.setupFullMustacheParams(sexpr, program, inverse),
          path = sexpr.path,
          name = path.parts[0];

      if (this.options.knownHelpers[name]) {
        this.opcode('invokeKnownHelper', params.length, name);
      } else if (this.options.knownHelpersOnly) {
        throw new Exception("You specified knownHelpersOnly, but used the unknown helper " + name, sexpr);
      } else {
        path.falsy = true;

        this.accept(path);
        this.opcode('invokeHelper', params.length, path.original, AST.helpers.simpleId(path));
      }
    },

    PathExpression: function(path) {
      this.addDepth(path.depth);
      this.opcode('getContext', path.depth);

      var name = path.parts[0],
          scoped = AST.helpers.scopedId(path),
          blockParamId = !path.depth && !scoped && this.blockParamIndex(name);

      if (blockParamId) {
        this.opcode('lookupBlockParam', blockParamId, path.parts);
      } else  if (!name) {
        // Context reference, i.e. `{{foo .}}` or `{{foo ..}}`
        this.opcode('pushContext');
      } else if (path.data) {
        this.options.data = true;
        this.opcode('lookupData', path.depth, path.parts);
      } else {
        this.opcode('lookupOnContext', path.parts, path.falsy, scoped);
      }
    },

    StringLiteral: function(string) {
      this.opcode('pushString', string.value);
    },

    NumberLiteral: function(number) {
      this.opcode('pushLiteral', number.value);
    },

    BooleanLiteral: function(bool) {
      this.opcode('pushLiteral', bool.value);
    },

    Hash: function(hash) {
      var pairs = hash.pairs, i, l;

      this.opcode('pushHash');

      for (i=0, l=pairs.length; i<l; i++) {
        this.pushParam(pairs[i].value);
      }
      while (i--) {
        this.opcode('assignToHash', pairs[i].key);
      }
      this.opcode('popHash');
    },

    // HELPERS
    opcode: function(name) {
      this.opcodes.push({ opcode: name, args: slice.call(arguments, 1), loc: this.sourceNode[0].loc });
    },

    addDepth: function(depth) {
      if (!depth) {
        return;
      }

      this.useDepths = true;
    },

    classifySexpr: function(sexpr) {
      var isSimple = AST.helpers.simpleId(sexpr.path);

      var isBlockParam = isSimple && !!this.blockParamIndex(sexpr.path.parts[0]);

      // a mustache is an eligible helper if:
      // * its id is simple (a single part, not `this` or `..`)
      var isHelper = !isBlockParam && AST.helpers.helperExpression(sexpr);

      // if a mustache is an eligible helper but not a definite
      // helper, it is ambiguous, and will be resolved in a later
      // pass or at runtime.
      var isEligible = !isBlockParam && (isHelper || isSimple);

      var options = this.options;

      // if ambiguous, we can possibly resolve the ambiguity now
      // An eligible helper is one that does not have a complex path, i.e. `this.foo`, `../foo` etc.
      if (isEligible && !isHelper) {
        var name = sexpr.path.parts[0];

        if (options.knownHelpers[name]) {
          isHelper = true;
        } else if (options.knownHelpersOnly) {
          isEligible = false;
        }
      }

      if (isHelper) { return 'helper'; }
      else if (isEligible) { return 'ambiguous'; }
      else { return 'simple'; }
    },

    pushParams: function(params) {
      for(var i=0, l=params.length; i<l; i++) {
        this.pushParam(params[i]);
      }
    },

    pushParam: function(val) {
      var value = val.value != null ? val.value : val.original || '';

      if (this.stringParams) {
        if (value.replace) {
          value = value
              .replace(/^(\.?\.\/)*/g, '')
              .replace(/\//g, '.');
        }

        if(val.depth) {
          this.addDepth(val.depth);
        }
        this.opcode('getContext', val.depth || 0);
        this.opcode('pushStringParam', value, val.type);

        if (val.type === 'SubExpression') {
          // SubExpressions get evaluated and passed in
          // in string params mode.
          this.accept(val);
        }
      } else {
        if (this.trackIds) {
          var blockParamIndex;
          if (val.parts && !AST.helpers.scopedId(val) && !val.depth) {
             blockParamIndex = this.blockParamIndex(val.parts[0]);
          }
          if (blockParamIndex) {
            var blockParamChild = val.parts.slice(1).join('.');
            this.opcode('pushId', 'BlockParam', blockParamIndex, blockParamChild);
          } else {
            value = val.original || value;
            if (value.replace) {
              value = value
                  .replace(/^\.\//g, '')
                  .replace(/^\.$/g, '');
            }

            this.opcode('pushId', val.type, value);
          }
        }
        this.accept(val);
      }
    },

    setupFullMustacheParams: function(sexpr, program, inverse, omitEmpty) {
      var params = sexpr.params;
      this.pushParams(params);

      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);

      if (sexpr.hash) {
        this.accept(sexpr.hash);
      } else {
        this.opcode('emptyHash', omitEmpty);
      }

      return params;
    },

    blockParamIndex: function(name) {
      for (var depth = 0, len = this.options.blockParams.length; depth < len; depth++) {
        var blockParams = this.options.blockParams[depth],
            param = blockParams && indexOf(blockParams, name);
        if (blockParams && param >= 0) {
          return [depth, param];
        }
      }
    }
  };

  function precompile(input, options, env) {
    if (input == null || (typeof input !== 'string' && input.type !== 'Program')) {
      throw new Exception("You must pass a string or Handlebars AST to Handlebars.precompile. You passed " + input);
    }

    options = options || {};
    if (!('data' in options)) {
      options.data = true;
    }
    if (options.compat) {
      options.useDepths = true;
    }

    var ast = env.parse(input, options);
    var environment = new env.Compiler().compile(ast, options);
    return new env.JavaScriptCompiler().compile(environment, options);
  }

  __exports__.precompile = precompile;function compile(input, options, env) {
    if (input == null || (typeof input !== 'string' && input.type !== 'Program')) {
      throw new Exception("You must pass a string or Handlebars AST to Handlebars.compile. You passed " + input);
    }

    options = options || {};

    if (!('data' in options)) {
      options.data = true;
    }
    if (options.compat) {
      options.useDepths = true;
    }

    var compiled;

    function compileInput() {
      var ast = env.parse(input, options);
      var environment = new env.Compiler().compile(ast, options);
      var templateSpec = new env.JavaScriptCompiler().compile(environment, options, undefined, true);
      return env.template(templateSpec);
    }

    // Template is only compiled on first use and cached after that point.
    var ret = function(context, options) {
      if (!compiled) {
        compiled = compileInput();
      }
      return compiled.call(this, context, options);
    };
    ret._setup = function(options) {
      if (!compiled) {
        compiled = compileInput();
      }
      return compiled._setup(options);
    };
    ret._child = function(i, data, blockParams, depths) {
      if (!compiled) {
        compiled = compileInput();
      }
      return compiled._child(i, data, blockParams, depths);
    };
    return ret;
  }

  __exports__.compile = compile;function argEquals(a, b) {
    if (a === b) {
      return true;
    }

    if (isArray(a) && isArray(b) && a.length === b.length) {
      for (var i = 0; i < a.length; i++) {
        if (!argEquals(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
  }

  function transformLiteralToPath(sexpr) {
    if (!sexpr.path.parts) {
      var literal = sexpr.path;
      // Casting to string here to make false and 0 literal values play nicely with the rest
      // of the system.
      sexpr.path = new AST.PathExpression(false, 0, [literal.original+''], literal.original+'', literal.log);
    }
  }
  return __exports__;
})(__module4__, __module3__, __module7__);

// handlebars/compiler/code-gen.js
var __module15__ = (function(__dependency1__) {
  "use strict";
  var __exports__;
  var isArray = __dependency1__.isArray;

  try {
    var SourceMap = require('source-map'),
          SourceNode = SourceMap.SourceNode;
  } catch (err) {
    /* istanbul ignore next: tested but not covered in istanbul due to dist build  */
    SourceNode = function(line, column, srcFile, chunks) {
      this.src = '';
      if (chunks) {
        this.add(chunks);
      }
    };
    /* istanbul ignore next */
    SourceNode.prototype = {
      add: function(chunks) {
        if (isArray(chunks)) {
          chunks = chunks.join('');
        }
        this.src += chunks;
      },
      prepend: function(chunks) {
        if (isArray(chunks)) {
          chunks = chunks.join('');
        }
        this.src = chunks + this.src;
      },
      toStringWithSourceMap: function() {
        return {code: this.toString()};
      },
      toString: function() {
        return this.src;
      }
    };
  }


  function castChunk(chunk, codeGen, loc) {
    if (isArray(chunk)) {
      var ret = [];

      for (var i = 0, len = chunk.length; i < len; i++) {
        ret.push(codeGen.wrap(chunk[i], loc));
      }
      return ret;
    } else if (typeof chunk === 'boolean' || typeof chunk === 'number') {
      // Handle primitives that the SourceNode will throw up on
      return chunk+'';
    }
    return chunk;
  }


  function CodeGen(srcFile) {
    this.srcFile = srcFile;
    this.source = [];
  }

  CodeGen.prototype = {
    prepend: function(source, loc) {
      this.source.unshift(this.wrap(source, loc));
    },
    push: function(source, loc) {
      this.source.push(this.wrap(source, loc));
    },

    merge: function() {
      var source = this.empty();
      this.each(function(line) {
        source.add(['  ', line, '\n']);
      });
      return source;
    },

    each: function(iter) {
      for (var i = 0, len = this.source.length; i < len; i++) {
        iter(this.source[i]);
      }
    },

    empty: function(loc) {
      loc = loc || this.currentLocation || {start:{}};
      return new SourceNode(loc.start.line, loc.start.column, this.srcFile);
    },
    wrap: function(chunk, loc) {
      if (chunk instanceof SourceNode) {
        return chunk;
      }

      loc = loc || this.currentLocation || {start:{}};
      chunk = castChunk(chunk, this, loc);

      return new SourceNode(loc.start.line, loc.start.column, this.srcFile, chunk);
    },

    functionCall: function(fn, type, params) {
      params = this.generateList(params);
      return this.wrap([fn, type ? '.' + type + '(' : '(', params, ')']);
    },

    quotedString: function(str) {
      return '"' + (str + '')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\u2028/g, '\\u2028')   // Per Ecma-262 7.3 + 7.8.4
        .replace(/\u2029/g, '\\u2029') + '"';
    },

    objectLiteral: function(obj) {
      var pairs = [];

      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          var value = castChunk(obj[key], this);
          if (value !== 'undefined') {
            pairs.push([this.quotedString(key), ':', value]);
          }
        }
      }

      var ret = this.generateList(pairs);
      ret.prepend('{');
      ret.add('}');
      return ret;
    },


    generateList: function(entries, loc) {
      var ret = this.empty(loc);

      for (var i = 0, len = entries.length; i < len; i++) {
        if (i) {
          ret.add(',');
        }

        ret.add(castChunk(entries[i], this, loc));
      }

      return ret;
    },

    generateArray: function(entries, loc) {
      var ret = this.generateList(entries, loc);
      ret.prepend('[');
      ret.add(']');

      return ret;
    }
  };

  __exports__ = CodeGen;
  return __exports__;
})(__module3__);

// handlebars/compiler/javascript-compiler.js
var __module14__ = (function(__dependency1__, __dependency2__, __dependency3__, __dependency4__) {
  "use strict";
  var __exports__;
  var COMPILER_REVISION = __dependency1__.COMPILER_REVISION;
  var REVISION_CHANGES = __dependency1__.REVISION_CHANGES;
  var Exception = __dependency2__;
  var isArray = __dependency3__.isArray;
  var CodeGen = __dependency4__;

  function Literal(value) {
    this.value = value;
  }

  function JavaScriptCompiler() {}

  JavaScriptCompiler.prototype = {
    // PUBLIC API: You can override these methods in a subclass to provide
    // alternative compiled forms for name lookup and buffering semantics
    nameLookup: function(parent, name /* , type*/) {
      if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
        return [parent, ".", name];
      } else {
        return [parent, "['", name, "']"];
      }
    },
    depthedLookup: function(name) {
      return [this.aliasable('this.lookup'), '(depths, "', name, '")'];
    },

    compilerInfo: function() {
      var revision = COMPILER_REVISION,
          versions = REVISION_CHANGES[revision];
      return [revision, versions];
    },

    appendToBuffer: function(source, location, explicit) {
      // Force a source as this simplifies the merge logic.
      if (!isArray(source)) {
        source = [source];
      }
      source = this.source.wrap(source, location);

      if (this.environment.isSimple) {
        return ['return ', source, ';'];
      } else if (explicit) {
        // This is a case where the buffer operation occurs as a child of another
        // construct, generally braces. We have to explicitly output these buffer
        // operations to ensure that the emitted code goes in the correct location.
        return ['buffer += ', source, ';'];
      } else {
        source.appendToBuffer = true;
        return source;
      }
    },

    initializeBuffer: function() {
      return this.quotedString("");
    },
    // END PUBLIC API

    compile: function(environment, options, context, asObject) {
      this.environment = environment;
      this.options = options;
      this.stringParams = this.options.stringParams;
      this.trackIds = this.options.trackIds;
      this.precompile = !asObject;

      this.name = this.environment.name;
      this.isChild = !!context;
      this.context = context || {
        programs: [],
        environments: []
      };

      this.preamble();

      this.stackSlot = 0;
      this.stackVars = [];
      this.aliases = {};
      this.registers = { list: [] };
      this.hashes = [];
      this.compileStack = [];
      this.inlineStack = [];
      this.blockParams = [];

      this.compileChildren(environment, options);

      this.useDepths = this.useDepths || environment.useDepths || this.options.compat;
      this.useBlockParams = this.useBlockParams || environment.useBlockParams;

      var opcodes = environment.opcodes,
          opcode,
          firstLoc,
          i,
          l;

      for (i = 0, l = opcodes.length; i < l; i++) {
        opcode = opcodes[i];

        this.source.currentLocation = opcode.loc;
        firstLoc = firstLoc || opcode.loc;
        this[opcode.opcode].apply(this, opcode.args);
      }

      // Flush any trailing content that might be pending.
      this.source.currentLocation = firstLoc;
      this.pushSource('');

      /* istanbul ignore next */
      if (this.stackSlot || this.inlineStack.length || this.compileStack.length) {
        throw new Exception('Compile completed with content left on stack');
      }

      var fn = this.createFunctionContext(asObject);
      if (!this.isChild) {
        var ret = {
          compiler: this.compilerInfo(),
          main: fn
        };
        var programs = this.context.programs;
        for (i = 0, l = programs.length; i < l; i++) {
          if (programs[i]) {
            ret[i] = programs[i];
          }
        }

        if (this.environment.usePartial) {
          ret.usePartial = true;
        }
        if (this.options.data) {
          ret.useData = true;
        }
        if (this.useDepths) {
          ret.useDepths = true;
        }
        if (this.useBlockParams) {
          ret.useBlockParams = true;
        }
        if (this.options.compat) {
          ret.compat = true;
        }

        if (!asObject) {
          ret.compiler = JSON.stringify(ret.compiler);

          this.source.currentLocation = {start: {line: 1, column: 0}};
          ret = this.objectLiteral(ret);

          if (options.srcName) {
            ret = ret.toStringWithSourceMap({file: options.destName});
            ret.map = ret.map && ret.map.toString();
          } else {
            ret = ret.toString();
          }
        } else {
          ret.compilerOptions = this.options;
        }

        return ret;
      } else {
        return fn;
      }
    },

    preamble: function() {
      // track the last context pushed into place to allow skipping the
      // getContext opcode when it would be a noop
      this.lastContext = 0;
      this.source = new CodeGen(this.options.srcName);
    },

    createFunctionContext: function(asObject) {
      var varDeclarations = '';

      var locals = this.stackVars.concat(this.registers.list);
      if(locals.length > 0) {
        varDeclarations += ", " + locals.join(", ");
      }

      // Generate minimizer alias mappings
      //
      // When using true SourceNodes, this will update all references to the given alias
      // as the source nodes are reused in situ. For the non-source node compilation mode,
      // aliases will not be used, but this case is already being run on the client and
      // we aren't concern about minimizing the template size.
      var aliasCount = 0;
      for (var alias in this.aliases) {
        var node = this.aliases[alias];

        if (this.aliases.hasOwnProperty(alias) && node.children && node.referenceCount > 1) {
          varDeclarations += ', alias' + (++aliasCount) + '=' + alias;
          node.children[0] = 'alias' + aliasCount;
        }
      }

      var params = ["depth0", "helpers", "partials", "data"];

      if (this.useBlockParams || this.useDepths) {
        params.push('blockParams');
      }
      if (this.useDepths) {
        params.push('depths');
      }

      // Perform a second pass over the output to merge content when possible
      var source = this.mergeSource(varDeclarations);

      if (asObject) {
        params.push(source);

        return Function.apply(this, params);
      } else {
        return this.source.wrap(['function(', params.join(','), ') {\n  ', source, '}']);
      }
    },
    mergeSource: function(varDeclarations) {
      var isSimple = this.environment.isSimple,
          appendOnly = !this.forceBuffer,
          appendFirst,

          sourceSeen,
          bufferStart,
          bufferEnd;
      this.source.each(function(line) {
        if (line.appendToBuffer) {
          if (bufferStart) {
            line.prepend('  + ');
          } else {
            bufferStart = line;
          }
          bufferEnd = line;
        } else {
          if (bufferStart) {
            if (!sourceSeen) {
              appendFirst = true;
            } else {
              bufferStart.prepend('buffer += ');
            }
            bufferEnd.add(';');
            bufferStart = bufferEnd = undefined;
          }

          sourceSeen = true;
          if (!isSimple) {
            appendOnly = false;
          }
        }
      });


      if (appendOnly) {
        if (bufferStart) {
          bufferStart.prepend('return ');
          bufferEnd.add(';');
        } else if (!sourceSeen) {
          this.source.push('return "";');
        }
      } else {
        varDeclarations += ", buffer = " + (appendFirst ? '' : this.initializeBuffer());

        if (bufferStart) {
          bufferStart.prepend('return buffer + ');
          bufferEnd.add(';');
        } else {
          this.source.push('return buffer;');
        }
      }

      if (varDeclarations) {
        this.source.prepend('var ' + varDeclarations.substring(2) + (appendFirst ? '' : ';\n'));
      }

      return this.source.merge();
    },

    // [blockValue]
    //
    // On stack, before: hash, inverse, program, value
    // On stack, after: return value of blockHelperMissing
    //
    // The purpose of this opcode is to take a block of the form
    // `{{#this.foo}}...{{/this.foo}}`, resolve the value of `foo`, and
    // replace it on the stack with the result of properly
    // invoking blockHelperMissing.
    blockValue: function(name) {
      var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
          params = [this.contextName(0)];
      this.setupHelperArgs(name, 0, params);

      var blockName = this.popStack();
      params.splice(1, 0, blockName);

      this.push(this.source.functionCall(blockHelperMissing, 'call', params));
    },

    // [ambiguousBlockValue]
    //
    // On stack, before: hash, inverse, program, value
    // Compiler value, before: lastHelper=value of last found helper, if any
    // On stack, after, if no lastHelper: same as [blockValue]
    // On stack, after, if lastHelper: value
    ambiguousBlockValue: function() {
      // We're being a bit cheeky and reusing the options value from the prior exec
      var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
          params = [this.contextName(0)];
      this.setupHelperArgs('', 0, params, true);

      this.flushInline();

      var current = this.topStack();
      params.splice(1, 0, current);

      this.pushSource([
          'if (!', this.lastHelper, ') { ',
            current, ' = ', this.source.functionCall(blockHelperMissing, 'call', params),
          '}']);
    },

    // [appendContent]
    //
    // On stack, before: ...
    // On stack, after: ...
    //
    // Appends the string value of `content` to the current buffer
    appendContent: function(content) {
      if (this.pendingContent) {
        content = this.pendingContent + content;
      } else {
        this.pendingLocation = this.source.currentLocation;
      }

      this.pendingContent = content;
    },

    // [append]
    //
    // On stack, before: value, ...
    // On stack, after: ...
    //
    // Coerces `value` to a String and appends it to the current buffer.
    //
    // If `value` is truthy, or 0, it is coerced into a string and appended
    // Otherwise, the empty string is appended
    append: function() {
      if (this.isInline()) {
        this.replaceStack(function(current) {
          return [' != null ? ', current, ' : ""'];
        });

        this.pushSource(this.appendToBuffer(this.popStack()));
      } else {
        var local = this.popStack();
        this.pushSource(['if (', local, ' != null) { ', this.appendToBuffer(local, undefined, true), ' }']);
        if (this.environment.isSimple) {
          this.pushSource(['else { ', this.appendToBuffer("''", undefined, true), ' }']);
        }
      }
    },

    // [appendEscaped]
    //
    // On stack, before: value, ...
    // On stack, after: ...
    //
    // Escape `value` and append it to the buffer
    appendEscaped: function() {
      this.pushSource(this.appendToBuffer(
          [this.aliasable('this.escapeExpression'), '(', this.popStack(), ')']));
    },

    // [getContext]
    //
    // On stack, before: ...
    // On stack, after: ...
    // Compiler value, after: lastContext=depth
    //
    // Set the value of the `lastContext` compiler value to the depth
    getContext: function(depth) {
      this.lastContext = depth;
    },

    // [pushContext]
    //
    // On stack, before: ...
    // On stack, after: currentContext, ...
    //
    // Pushes the value of the current context onto the stack.
    pushContext: function() {
      this.pushStackLiteral(this.contextName(this.lastContext));
    },

    // [lookupOnContext]
    //
    // On stack, before: ...
    // On stack, after: currentContext[name], ...
    //
    // Looks up the value of `name` on the current context and pushes
    // it onto the stack.
    lookupOnContext: function(parts, falsy, scoped) {
      var i = 0;

      if (!scoped && this.options.compat && !this.lastContext) {
        // The depthed query is expected to handle the undefined logic for the root level that
        // is implemented below, so we evaluate that directly in compat mode
        this.push(this.depthedLookup(parts[i++]));
      } else {
        this.pushContext();
      }

      this.resolvePath('context', parts, i, falsy);
    },

    // [lookupBlockParam]
    //
    // On stack, before: ...
    // On stack, after: blockParam[name], ...
    //
    // Looks up the value of `parts` on the given block param and pushes
    // it onto the stack.
    lookupBlockParam: function(blockParamId, parts) {
      this.useBlockParams = true;

      this.push(['blockParams[', blockParamId[0], '][', blockParamId[1], ']']);
      this.resolvePath('context', parts, 1);
    },

    // [lookupData]
    //
    // On stack, before: ...
    // On stack, after: data, ...
    //
    // Push the data lookup operator
    lookupData: function(depth, parts) {
      /*jshint -W083 */
      if (!depth) {
        this.pushStackLiteral('data');
      } else {
        this.pushStackLiteral('this.data(data, ' + depth + ')');
      }

      this.resolvePath('data', parts, 0, true);
    },

    resolvePath: function(type, parts, i, falsy) {
      /*jshint -W083 */
      if (this.options.strict || this.options.assumeObjects) {
        this.push(strictLookup(this.options.strict, this, parts, type));
        return;
      }

      var len = parts.length;
      for (; i < len; i++) {
        this.replaceStack(function(current) {
          var lookup = this.nameLookup(current, parts[i], type);
          // We want to ensure that zero and false are handled properly if the context (falsy flag)
          // needs to have the special handling for these values.
          if (!falsy) {
            return [' != null ? ', lookup, ' : ', current];
          } else {
            // Otherwise we can use generic falsy handling
            return [' && ', lookup];
          }
        });
      }
    },

    // [resolvePossibleLambda]
    //
    // On stack, before: value, ...
    // On stack, after: resolved value, ...
    //
    // If the `value` is a lambda, replace it on the stack by
    // the return value of the lambda
    resolvePossibleLambda: function() {
      this.push([this.aliasable('this.lambda'), '(', this.popStack(), ', ', this.contextName(0), ')']);
    },

    // [pushStringParam]
    //
    // On stack, before: ...
    // On stack, after: string, currentContext, ...
    //
    // This opcode is designed for use in string mode, which
    // provides the string value of a parameter along with its
    // depth rather than resolving it immediately.
    pushStringParam: function(string, type) {
      this.pushContext();
      this.pushString(type);

      // If it's a subexpression, the string result
      // will be pushed after this opcode.
      if (type !== 'SubExpression') {
        if (typeof string === 'string') {
          this.pushString(string);
        } else {
          this.pushStackLiteral(string);
        }
      }
    },

    emptyHash: function(omitEmpty) {
      if (this.trackIds) {
        this.push('{}'); // hashIds
      }
      if (this.stringParams) {
        this.push('{}'); // hashContexts
        this.push('{}'); // hashTypes
      }
      this.pushStackLiteral(omitEmpty ? 'undefined' : '{}');
    },
    pushHash: function() {
      if (this.hash) {
        this.hashes.push(this.hash);
      }
      this.hash = {values: [], types: [], contexts: [], ids: []};
    },
    popHash: function() {
      var hash = this.hash;
      this.hash = this.hashes.pop();

      if (this.trackIds) {
        this.push(this.objectLiteral(hash.ids));
      }
      if (this.stringParams) {
        this.push(this.objectLiteral(hash.contexts));
        this.push(this.objectLiteral(hash.types));
      }

      this.push(this.objectLiteral(hash.values));
    },

    // [pushString]
    //
    // On stack, before: ...
    // On stack, after: quotedString(string), ...
    //
    // Push a quoted version of `string` onto the stack
    pushString: function(string) {
      this.pushStackLiteral(this.quotedString(string));
    },

    // [pushLiteral]
    //
    // On stack, before: ...
    // On stack, after: value, ...
    //
    // Pushes a value onto the stack. This operation prevents
    // the compiler from creating a temporary variable to hold
    // it.
    pushLiteral: function(value) {
      this.pushStackLiteral(value);
    },

    // [pushProgram]
    //
    // On stack, before: ...
    // On stack, after: program(guid), ...
    //
    // Push a program expression onto the stack. This takes
    // a compile-time guid and converts it into a runtime-accessible
    // expression.
    pushProgram: function(guid) {
      if (guid != null) {
        this.pushStackLiteral(this.programExpression(guid));
      } else {
        this.pushStackLiteral(null);
      }
    },

    // [invokeHelper]
    //
    // On stack, before: hash, inverse, program, params..., ...
    // On stack, after: result of helper invocation
    //
    // Pops off the helper's parameters, invokes the helper,
    // and pushes the helper's return value onto the stack.
    //
    // If the helper is not found, `helperMissing` is called.
    invokeHelper: function(paramSize, name, isSimple) {
      var nonHelper = this.popStack();
      var helper = this.setupHelper(paramSize, name);
      var simple = isSimple ? [helper.name, ' || '] : '';

      var lookup = ['('].concat(simple, nonHelper);
      if (!this.options.strict) {
        lookup.push(' || ', this.aliasable('helpers.helperMissing'));
      }
      lookup.push(')');

      this.push(this.source.functionCall(lookup, 'call', helper.callParams));
    },

    // [invokeKnownHelper]
    //
    // On stack, before: hash, inverse, program, params..., ...
    // On stack, after: result of helper invocation
    //
    // This operation is used when the helper is known to exist,
    // so a `helperMissing` fallback is not required.
    invokeKnownHelper: function(paramSize, name) {
      var helper = this.setupHelper(paramSize, name);
      this.push(this.source.functionCall(helper.name, 'call', helper.callParams));
    },

    // [invokeAmbiguous]
    //
    // On stack, before: hash, inverse, program, params..., ...
    // On stack, after: result of disambiguation
    //
    // This operation is used when an expression like `{{foo}}`
    // is provided, but we don't know at compile-time whether it
    // is a helper or a path.
    //
    // This operation emits more code than the other options,
    // and can be avoided by passing the `knownHelpers` and
    // `knownHelpersOnly` flags at compile-time.
    invokeAmbiguous: function(name, helperCall) {
      this.useRegister('helper');

      var nonHelper = this.popStack();

      this.emptyHash();
      var helper = this.setupHelper(0, name, helperCall);

      var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');

      var lookup = ['(', '(helper = ', helperName, ' || ', nonHelper, ')'];
      if (!this.options.strict) {
        lookup[0] = '(helper = ';
        lookup.push(
          ' != null ? helper : ',
          this.aliasable('helpers.helperMissing')
        );
      }

      this.push([
          '(', lookup,
          (helper.paramsInit ? ['),(', helper.paramsInit] : []), '),',
          '(typeof helper === ', this.aliasable('"function"'), ' ? ',
          this.source.functionCall('helper','call', helper.callParams), ' : helper))'
      ]);
    },

    // [invokePartial]
    //
    // On stack, before: context, ...
    // On stack after: result of partial invocation
    //
    // This operation pops off a context, invokes a partial with that context,
    // and pushes the result of the invocation back.
    invokePartial: function(isDynamic, name, indent) {
      var params = [],
          options = this.setupParams(name, 1, params, false);

      if (isDynamic) {
        name = this.popStack();
        delete options.name;
      }

      if (indent) {
        options.indent = JSON.stringify(indent);
      }
      options.helpers = 'helpers';
      options.partials = 'partials';

      if (!isDynamic) {
        params.unshift(this.nameLookup('partials', name, 'partial'));
      } else {
        params.unshift(name);
      }

      if (this.options.compat) {
        options.depths = 'depths';
      }
      options = this.objectLiteral(options);
      params.push(options);

      this.push(this.source.functionCall('this.invokePartial', '', params));
    },

    // [assignToHash]
    //
    // On stack, before: value, ..., hash, ...
    // On stack, after: ..., hash, ...
    //
    // Pops a value off the stack and assigns it to the current hash
    assignToHash: function(key) {
      var value = this.popStack(),
          context,
          type,
          id;

      if (this.trackIds) {
        id = this.popStack();
      }
      if (this.stringParams) {
        type = this.popStack();
        context = this.popStack();
      }

      var hash = this.hash;
      if (context) {
        hash.contexts[key] = context;
      }
      if (type) {
        hash.types[key] = type;
      }
      if (id) {
        hash.ids[key] = id;
      }
      hash.values[key] = value;
    },

    pushId: function(type, name, child) {
      if (type === 'BlockParam') {
        this.pushStackLiteral(
            'blockParams[' + name[0] + '].path[' + name[1] + ']'
            + (child ? ' + ' + JSON.stringify('.' + child) : ''));
      } else if (type === 'PathExpression') {
        this.pushString(name);
      } else if (type === 'SubExpression') {
        this.pushStackLiteral('true');
      } else {
        this.pushStackLiteral('null');
      }
    },

    // HELPERS

    compiler: JavaScriptCompiler,

    compileChildren: function(environment, options) {
      var children = environment.children, child, compiler;

      for(var i=0, l=children.length; i<l; i++) {
        child = children[i];
        compiler = new this.compiler();

        var index = this.matchExistingProgram(child);

        if (index == null) {
          this.context.programs.push('');     // Placeholder to prevent name conflicts for nested children
          index = this.context.programs.length;
          child.index = index;
          child.name = 'program' + index;
          this.context.programs[index] = compiler.compile(child, options, this.context, !this.precompile);
          this.context.environments[index] = child;

          this.useDepths = this.useDepths || compiler.useDepths;
          this.useBlockParams = this.useBlockParams || compiler.useBlockParams;
        } else {
          child.index = index;
          child.name = 'program' + index;

          this.useDepths = this.useDepths || child.useDepths;
          this.useBlockParams = this.useBlockParams || child.useBlockParams;
        }
      }
    },
    matchExistingProgram: function(child) {
      for (var i = 0, len = this.context.environments.length; i < len; i++) {
        var environment = this.context.environments[i];
        if (environment && environment.equals(child)) {
          return i;
        }
      }
    },

    programExpression: function(guid) {
      var child = this.environment.children[guid],
          programParams = [child.index, 'data', child.blockParams];

      if (this.useBlockParams || this.useDepths) {
        programParams.push('blockParams');
      }
      if (this.useDepths) {
        programParams.push('depths');
      }

      return 'this.program(' + programParams.join(', ') + ')';
    },

    useRegister: function(name) {
      if(!this.registers[name]) {
        this.registers[name] = true;
        this.registers.list.push(name);
      }
    },

    push: function(expr) {
      if (!(expr instanceof Literal)) {
        expr = this.source.wrap(expr);
      }

      this.inlineStack.push(expr);
      return expr;
    },

    pushStackLiteral: function(item) {
      this.push(new Literal(item));
    },

    pushSource: function(source) {
      if (this.pendingContent) {
        this.source.push(
            this.appendToBuffer(this.source.quotedString(this.pendingContent), this.pendingLocation));
        this.pendingContent = undefined;
      }

      if (source) {
        this.source.push(source);
      }
    },

    replaceStack: function(callback) {
      var prefix = ['('],
          stack,
          createdStack,
          usedLiteral;

      /* istanbul ignore next */
      if (!this.isInline()) {
        throw new Exception('replaceStack on non-inline');
      }

      // We want to merge the inline statement into the replacement statement via ','
      var top = this.popStack(true);

      if (top instanceof Literal) {
        // Literals do not need to be inlined
        stack = [top.value];
        prefix = ['(', stack];
        usedLiteral = true;
      } else {
        // Get or create the current stack name for use by the inline
        createdStack = true;
        var name = this.incrStack();

        prefix = ['((', this.push(name), ' = ', top, ')'];
        stack = this.topStack();
      }

      var item = callback.call(this, stack);

      if (!usedLiteral) {
        this.popStack();
      }
      if (createdStack) {
        this.stackSlot--;
      }
      this.push(prefix.concat(item, ')'));
    },

    incrStack: function() {
      this.stackSlot++;
      if(this.stackSlot > this.stackVars.length) { this.stackVars.push("stack" + this.stackSlot); }
      return this.topStackName();
    },
    topStackName: function() {
      return "stack" + this.stackSlot;
    },
    flushInline: function() {
      var inlineStack = this.inlineStack;
      this.inlineStack = [];
      for (var i = 0, len = inlineStack.length; i < len; i++) {
        var entry = inlineStack[i];
        /* istanbul ignore if */
        if (entry instanceof Literal) {
          this.compileStack.push(entry);
        } else {
          var stack = this.incrStack();
          this.pushSource([stack, ' = ', entry, ';']);
          this.compileStack.push(stack);
        }
      }
    },
    isInline: function() {
      return this.inlineStack.length;
    },

    popStack: function(wrapped) {
      var inline = this.isInline(),
          item = (inline ? this.inlineStack : this.compileStack).pop();

      if (!wrapped && (item instanceof Literal)) {
        return item.value;
      } else {
        if (!inline) {
          /* istanbul ignore next */
          if (!this.stackSlot) {
            throw new Exception('Invalid stack pop');
          }
          this.stackSlot--;
        }
        return item;
      }
    },

    topStack: function() {
      var stack = (this.isInline() ? this.inlineStack : this.compileStack),
          item = stack[stack.length - 1];

      /* istanbul ignore if */
      if (item instanceof Literal) {
        return item.value;
      } else {
        return item;
      }
    },

    contextName: function(context) {
      if (this.useDepths && context) {
        return 'depths[' + context + ']';
      } else {
        return 'depth' + context;
      }
    },

    quotedString: function(str) {
      return this.source.quotedString(str);
    },

    objectLiteral: function(obj) {
      return this.source.objectLiteral(obj);
    },

    aliasable: function(name) {
      var ret = this.aliases[name];
      if (ret) {
        ret.referenceCount++;
        return ret;
      }

      ret = this.aliases[name] = this.source.wrap(name);
      ret.aliasable = true;
      ret.referenceCount = 1;

      return ret;
    },

    setupHelper: function(paramSize, name, blockHelper) {
      var params = [],
          paramsInit = this.setupHelperArgs(name, paramSize, params, blockHelper);
      var foundHelper = this.nameLookup('helpers', name, 'helper');

      return {
        params: params,
        paramsInit: paramsInit,
        name: foundHelper,
        callParams: [this.contextName(0)].concat(params)
      };
    },

    setupParams: function(helper, paramSize, params) {
      var options = {}, contexts = [], types = [], ids = [], param;

      options.name = this.quotedString(helper);
      options.hash = this.popStack();

      if (this.trackIds) {
        options.hashIds = this.popStack();
      }
      if (this.stringParams) {
        options.hashTypes = this.popStack();
        options.hashContexts = this.popStack();
      }

      var inverse = this.popStack(),
          program = this.popStack();

      // Avoid setting fn and inverse if neither are set. This allows
      // helpers to do a check for `if (options.fn)`
      if (program || inverse) {
        options.fn = program || 'this.noop';
        options.inverse = inverse || 'this.noop';
      }

      // The parameters go on to the stack in order (making sure that they are evaluated in order)
      // so we need to pop them off the stack in reverse order
      var i = paramSize;
      while (i--) {
        param = this.popStack();
        params[i] = param;

        if (this.trackIds) {
          ids[i] = this.popStack();
        }
        if (this.stringParams) {
          types[i] = this.popStack();
          contexts[i] = this.popStack();
        }
      }

      if (this.trackIds) {
        options.ids = this.source.generateArray(ids);
      }
      if (this.stringParams) {
        options.types = this.source.generateArray(types);
        options.contexts = this.source.generateArray(contexts);
      }

      if (this.options.data) {
        options.data = 'data';
      }
      if (this.useBlockParams) {
        options.blockParams = 'blockParams';
      }
      return options;
    },

    setupHelperArgs: function(helper, paramSize, params, useRegister) {
      var options = this.setupParams(helper, paramSize, params, true);
      options = this.objectLiteral(options);
      if (useRegister) {
        this.useRegister('options');
        params.push('options');
        return ['options=', options];
      } else {
        params.push(options);
        return '';
      }
    }
  };


  var reservedWords = (
    "break else new var" +
    " case finally return void" +
    " catch for switch while" +
    " continue function this with" +
    " default if throw" +
    " delete in try" +
    " do instanceof typeof" +
    " abstract enum int short" +
    " boolean export interface static" +
    " byte extends long super" +
    " char final native synchronized" +
    " class float package throws" +
    " const goto private transient" +
    " debugger implements protected volatile" +
    " double import public let yield await" +
    " null true false"
  ).split(" ");

  var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

  for(var i=0, l=reservedWords.length; i<l; i++) {
    compilerWords[reservedWords[i]] = true;
  }

  JavaScriptCompiler.isValidJavaScriptVariableName = function(name) {
    return !JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
  };

  function strictLookup(requireTerminal, compiler, parts, type) {
    var stack = compiler.popStack();

    var i = 0,
        len = parts.length;
    if (requireTerminal) {
      len--;
    }

    for (; i < len; i++) {
      stack = compiler.nameLookup(stack, parts[i], type);
    }

    if (requireTerminal) {
      return [compiler.aliasable('this.strict'), '(', stack, ', ', compiler.quotedString(parts[i]), ')'];
    } else {
      return stack;
    }
  }

  __exports__ = JavaScriptCompiler;
  return __exports__;
})(__module2__, __module4__, __module3__, __module15__);

// handlebars.js
var __module0__ = (function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__) {
  "use strict";
  var __exports__;
  /*globals Handlebars: true */
  var Handlebars = __dependency1__;

  // Compiler imports
  var AST = __dependency2__;
  var Parser = __dependency3__.parser;
  var parse = __dependency3__.parse;
  var Compiler = __dependency4__.Compiler;
  var compile = __dependency4__.compile;
  var precompile = __dependency4__.precompile;
  var JavaScriptCompiler = __dependency5__;

  var _create = Handlebars.create;
  var create = function() {
    var hb = _create();

    hb.compile = function(input, options) {
      return compile(input, options, hb);
    };
    hb.precompile = function (input, options) {
      return precompile(input, options, hb);
    };

    hb.AST = AST;
    hb.Compiler = Compiler;
    hb.JavaScriptCompiler = JavaScriptCompiler;
    hb.Parser = Parser;
    hb.parse = parse;

    return hb;
  };

  Handlebars = create();
  Handlebars.create = create;

  /*jshint -W040 */
  /* istanbul ignore next */
  var root = typeof global !== 'undefined' ? global : window,
      $Handlebars = root.Handlebars;
  /* istanbul ignore next */
  Handlebars.noConflict = function() {
    if (root.Handlebars === Handlebars) {
      root.Handlebars = $Handlebars;
    }
  };

  Handlebars['default'] = Handlebars;

  __exports__ = Handlebars;
  return __exports__;
})(__module1__, __module7__, __module8__, __module13__, __module14__);

  return __module0__;
}));

/**
 *
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var APP = APP || {};
APP.Main = (function() {

    var LAZY_LOAD_THRESHOLD = 300;
    var $ = document.querySelector.bind(document);

    var stories = null;
    var storyStart = 0;
    var count = 20;
    var main = $('main');
    var inDetails = false;
    var storyLoadCount = 0;
    var storyDetails = document.querySelector('section');
    var storyDetailsVars = {};
    var scrollTimer = null;
    var localeData = {
        data: {
            intl: {
                locales: 'en-US'
            }
        }
    };

    var tmplStory = $('#tmpl-story').textContent;
    var tmplStoryDetails = $('#tmpl-story-details').textContent;
    var tmplStoryDetailsComment = $('#tmpl-story-details-comment').textContent;

    if (typeof HandlebarsIntl !== 'undefined') {
        HandlebarsIntl.registerWith(Handlebars);
    } else {

        // Remove references to formatRelative, because Intl isn't supported.
        var intlRelative = /, {{ formatRelative time }}/;
        tmplStory = tmplStory.replace(intlRelative, '');
        tmplStoryDetails = tmplStoryDetails.replace(intlRelative, '');
        tmplStoryDetailsComment = tmplStoryDetailsComment.replace(intlRelative, '');
    }

    var storyTemplate =
        Handlebars.compile(tmplStory);
    var storyDetailsTemplate =
        Handlebars.compile(tmplStoryDetails);
    var storyDetailsCommentTemplate =
        Handlebars.compile(tmplStoryDetailsComment);

    /**
     * As every single story arrives in shove its
     * content in at that exact moment. Feels like something
     * that should really be handled more delicately, and
     * probably in a requestAnimationFrame callback.
     */
    function onStoryData(key, details) {

        // This seems odd. Surely we could just select the story
        // directly rather than looping through all of them.

        details.time *= 1000;
        var story = document.querySelector('#s-' + key);
        var html = storyTemplate(details);
        fastdom.mutate(function() {
            story.innerHTML = html;
            story.addEventListener('click', onStoryClick.bind(this, details));
            story.classList.add('clickable');
            // Tick down. When zero we can batch in the next load.
            storyLoadCount--;

            // Colorize on complete.
            if (storyLoadCount === 0)
                requestAnimationFrame(colorizeAndScaleStories)
        });
    }

    function onStoryClick(details) {
        if (details.url)
            details.urlobj = new URL(details.url);

        var comment;
        var commentsElement;
        var storyHeader;
        var storyContent;



        storyDetailsVars.id = storyDetails.getAttribute("id");
        if (storyDetailsVars.id === 'sd-' + details.id) {
            toggleStory();
            return;
        } else {
            storyDetailsVars.id = 'sd-' + details.id;
        }
        var storyDetailsHtml = storyDetailsTemplate(details);
        var kids = details.kids;
        var commentHtml = storyDetailsCommentTemplate({
            by: '',
            text: 'Loading comment...'
        });


        storyDetails.setAttribute('id', storyDetails.id);
        storyDetails.innerHTML = storyDetailsHtml;
        var closeButton = storyDetails.querySelector('.js-close');
        closeButton.addEventListener('click', toggleStory);



        commentsElement = storyDetails.querySelector('.js-comments');
        storyHeader = storyDetails.querySelector('.js-header');
        storyContent = storyDetails.querySelector('.js-content');

        //var headerHeight = storyHeader.getBoundingClientRect().height;
        //storyContent.style.paddingTop = headerHeight + 'px';

        if (typeof kids === 'undefined')
            return;

        for (var k = 0; k < kids.length; k++) {
            APP.Data.getStoryComment(kids[k], function(commentDetails) {
                comment = document.createElement('aside');
                comment.setAttribute('id', 'sdc-' + kids[k]);
                comment.classList.add('story-details__comment');
                comment.innerHTML = commentHtml;
                commentsElement.appendChild(comment);

                // Update the comment with the live data.
                commentDetails.time *= 1000;
                comment.innerHTML = storyDetailsCommentTemplate(
                    commentDetails,
                    localeData);
            });
        }
        toggleStory();
    }

    function toggleStory() {
        var dumm = function() {
            storyDetails.classList.toggle('hidden');
        }
        requestAnimationFrame(dumm);
    }


    /**
     * Does this really add anything? Can we do this kind
     * of work in a cheaper way?
     */
    function colorizeAndScaleStories() {
        //return true;
        //
        var dots = [];
        var dot = {};
        var storyElements = document.querySelectorAll('.story');
        var bodytop = document.body.getBoundingClientRect().top;
        var height = main.offsetHeight;
        var mainPosition = main.getBoundingClientRect();
        // It does seem awfully broad to change all the
        // colors every time!
        for (var s = 0; s < storyElements.length; s++) {
            dot = {};
            var story = storyElements[s];
            var score = story.querySelector('.story__score');
            var title = story.querySelector('.story__title');
            var scoreLocation = score.getBoundingClientRect().top - bodytop;
            var scale = Math.min(1, 1 - (0.05 * ((scoreLocation - 170) / height)));
            var dotsize = scale * 40;
            var saturation = (100 * ((dotsize - 38) / 2));

            dot.dotsize = scale * 40;
            dot.opacity = scale;
            dot.saturation = saturation
            dot.story = story;
            dot.score = score;
            dot.title = title;
            dots.push(dot);

        }


        function paintdots() {
            dots.map(function(dot) {
                dot.score.style.width = dot.dotsize + 'px';
                dot.score.style.height = dot.dotsize + 'px';
                dot.score.style.lineHeight = dot.dotsize + 'px';
                dot.score.style.backgroundColor = 'hsl(42, ' + dot.saturation + '%, 50%)';
                dot.title.style.opacity = dot.opacity;
            })
        }
        requestAnimationFrame(paintdots);






    }

    function afterScroll() {
        requestAnimationFrame(colorizeAndScaleStories)
    }




    main.addEventListener('scroll', function() {
        if (scrollTimer !== null) {
            clearTimeout(scrollTimer);
        }
        scrollTimer = setTimeout(afterScroll, 50);
        var header = $('header');
        var headerTitles = header.querySelector('.header__title-wrapper');
        var scrollTopCapped = Math.min(70, main.scrollTop);
        var scaleString = 'scale(' + (1 - (scrollTopCapped / 300)) + ')';

        header.style.height = (156 - scrollTopCapped) + 'px';
        headerTitles.style.webkitTransform = scaleString;
        headerTitles.style.transform = scaleString;

        // Add a shadow to the header.
        fastdom.mutate(function() {
        if (main.scrollTop > 70)
            document.body.classList.add('raised');
        else
            document.body.classList.remove('raised');
        })
        // Check if we need to load the next batch of stories.
        var loadThreshold = (main.scrollHeight - main.offsetHeight -
            LAZY_LOAD_THRESHOLD);
        if (main.scrollTop > loadThreshold)
            loadStoryBatch();
    });

    function loadStoryBatch() {

        if (storyLoadCount > 0)
            return;

        storyLoadCount = count;

        var end = storyStart + count;
        for (var i = storyStart; i < end; i++) {

            if (i >= stories.length)
                return;

            var key = String(stories[i]);
            var story = document.createElement('div');
            story.setAttribute('id', 's-' + key);
            story.classList.add('story');
            story.innerHTML = storyTemplate({
                title: '...',
                score: '-',
                by: '...',
                time: 0
            });
            main.appendChild(story);

            APP.Data.getStoryById(stories[i], onStoryData.bind(this, key));
        }

        storyStart += count;

    }

    // Bootstrap in the stories.
    APP.Data.getTopStories(function(data) {
        stories = data;
        loadStoryBatch();
        main.classList.remove('loading');
    });

})();

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRhdGEuanMiLCJmYXN0ZG9tLmpzIiwiaGFuZGxlYmFycy1pbnRsLm1pbi5qcyIsImhhbmRsZWJhcnMtdjMuMC4wLmpzIiwiYXBwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsUEE7QUFDQTtBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICpcclxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG52YXIgQVBQID0gQVBQIHx8IHt9O1xyXG5BUFAuRGF0YSA9IChmdW5jdGlvbigpIHtcclxuXHJcbiAgdmFyIEhOX0FQSV9CQVNFID0gJ2h0dHBzOi8vaGFja2VyLW5ld3MuZmlyZWJhc2Vpby5jb20nO1xyXG4gIHZhciBITl9UT1BTVE9SSUVTX1VSTCA9IEhOX0FQSV9CQVNFICsgJy92MC90b3BzdG9yaWVzLmpzb24nO1xyXG4gIHZhciBITl9TVE9SWURFVEFJTFNfVVJMID0gSE5fQVBJX0JBU0UgKyAnL3YwL2l0ZW0vW0lEXS5qc29uJztcclxuXHJcbiAgZnVuY3Rpb24gZ2V0VG9wU3RvcmllcyhjYWxsYmFjaykge1xyXG4gICAgcmVxdWVzdChITl9UT1BTVE9SSUVTX1VSTCwgZnVuY3Rpb24oZXZ0KSB7XHJcbiAgICAgIGNhbGxiYWNrKGV2dC50YXJnZXQucmVzcG9uc2UpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBnZXRTdG9yeUJ5SWQoaWQsIGNhbGxiYWNrKSB7XHJcblxyXG4gICAgdmFyIHN0b3J5VVJMID0gSE5fU1RPUllERVRBSUxTX1VSTC5yZXBsYWNlKC9cXFtJRFxcXS8sIGlkKTtcclxuXHJcbiAgICByZXF1ZXN0KHN0b3J5VVJMLCBmdW5jdGlvbihldnQpIHtcclxuICAgICAgY2FsbGJhY2soZXZ0LnRhcmdldC5yZXNwb25zZSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGdldFN0b3J5Q29tbWVudChpZCwgY2FsbGJhY2spIHtcclxuXHJcbiAgICB2YXIgc3RvcnlDb21tZW50VVJMID0gSE5fU1RPUllERVRBSUxTX1VSTC5yZXBsYWNlKC9cXFtJRFxcXS8sIGlkKTtcclxuXHJcbiAgICByZXF1ZXN0KHN0b3J5Q29tbWVudFVSTCwgZnVuY3Rpb24oZXZ0KSB7XHJcbiAgICAgIGNhbGxiYWNrKGV2dC50YXJnZXQucmVzcG9uc2UpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZXF1ZXN0KHVybCwgY2FsbGJhY2spIHtcclxuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuICAgIHhoci5vcGVuKCdHRVQnLCB1cmwsIHRydWUpO1xyXG4gICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdqc29uJztcclxuICAgIHhoci5vbmxvYWQgPSBjYWxsYmFjaztcclxuICAgIHhoci5zZW5kKCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgZ2V0VG9wU3RvcmllczogZ2V0VG9wU3RvcmllcyxcclxuICAgIGdldFN0b3J5QnlJZDogZ2V0U3RvcnlCeUlkLFxyXG4gICAgZ2V0U3RvcnlDb21tZW50OiBnZXRTdG9yeUNvbW1lbnRcclxuICB9O1xyXG5cclxufSkoKTtcclxuIiwiIShmdW5jdGlvbih3aW4pIHtcclxuXHJcbi8qKlxyXG4gKiBGYXN0RG9tXHJcbiAqXHJcbiAqIEVsaW1pbmF0ZXMgbGF5b3V0IHRocmFzaGluZ1xyXG4gKiBieSBiYXRjaGluZyBET00gcmVhZC93cml0ZVxyXG4gKiBpbnRlcmFjdGlvbnMuXHJcbiAqXHJcbiAqIEBhdXRob3IgV2lsc29uIFBhZ2UgPHdpbHNvbnBhZ2VAbWUuY29tPlxyXG4gKiBAYXV0aG9yIEtvcm5lbCBMZXNpbnNraSA8a29ybmVsLmxlc2luc2tpQGZ0LmNvbT5cclxuICovXHJcblxyXG4ndXNlIHN0cmljdCc7XHJcblxyXG4vKipcclxuICogTWluaSBsb2dnZXJcclxuICpcclxuICogQHJldHVybiB7RnVuY3Rpb259XHJcbiAqL1xyXG52YXIgZGVidWcgPSAwID8gY29uc29sZS5sb2cuYmluZChjb25zb2xlLCAnW2Zhc3Rkb21dJykgOiBmdW5jdGlvbigpIHt9O1xyXG5cclxuLyoqXHJcbiAqIE5vcm1hbGl6ZWQgckFGXHJcbiAqXHJcbiAqIEB0eXBlIHtGdW5jdGlvbn1cclxuICovXHJcbnZhciByYWYgPSB3aW4ucmVxdWVzdEFuaW1hdGlvbkZyYW1lXHJcbiAgfHwgd2luLndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZVxyXG4gIHx8IHdpbi5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcclxuICB8fCB3aW4ubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcclxuICB8fCBmdW5jdGlvbihjYikgeyByZXR1cm4gc2V0VGltZW91dChjYiwgMTYpOyB9O1xyXG5cclxuLyoqXHJcbiAqIEluaXRpYWxpemUgYSBgRmFzdERvbWAuXHJcbiAqXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKi9cclxuZnVuY3Rpb24gRmFzdERvbSgpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgc2VsZi5yZWFkcyA9IFtdO1xyXG4gIHNlbGYud3JpdGVzID0gW107XHJcbiAgc2VsZi5yYWYgPSByYWYuYmluZCh3aW4pOyAvLyB0ZXN0IGhvb2tcclxuICBkZWJ1ZygnaW5pdGlhbGl6ZWQnLCBzZWxmKTtcclxufVxyXG5cclxuRmFzdERvbS5wcm90b3R5cGUgPSB7XHJcbiAgY29uc3RydWN0b3I6IEZhc3REb20sXHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZHMgYSBqb2IgdG8gdGhlIHJlYWQgYmF0Y2ggYW5kXHJcbiAgICogc2NoZWR1bGVzIGEgbmV3IGZyYW1lIGlmIG5lZWQgYmUuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cclxuICAgKiBAcHVibGljXHJcbiAgICovXHJcbiAgbWVhc3VyZTogZnVuY3Rpb24oZm4sIGN0eCkge1xyXG4gICAgZGVidWcoJ21lYXN1cmUnKTtcclxuICAgIHZhciB0YXNrID0gIWN0eCA/IGZuIDogZm4uYmluZChjdHgpO1xyXG4gICAgdGhpcy5yZWFkcy5wdXNoKHRhc2spO1xyXG4gICAgc2NoZWR1bGVGbHVzaCh0aGlzKTtcclxuICAgIHJldHVybiB0YXNrO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZHMgYSBqb2IgdG8gdGhlXHJcbiAgICogd3JpdGUgYmF0Y2ggYW5kIHNjaGVkdWxlc1xyXG4gICAqIGEgbmV3IGZyYW1lIGlmIG5lZWQgYmUuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cclxuICAgKiBAcHVibGljXHJcbiAgICovXHJcbiAgbXV0YXRlOiBmdW5jdGlvbihmbiwgY3R4KSB7XHJcbiAgICBkZWJ1ZygnbXV0YXRlJyk7XHJcbiAgICB2YXIgdGFzayA9ICFjdHggPyBmbiA6IGZuLmJpbmQoY3R4KTtcclxuICAgIHRoaXMud3JpdGVzLnB1c2godGFzayk7XHJcbiAgICBzY2hlZHVsZUZsdXNoKHRoaXMpO1xyXG4gICAgcmV0dXJuIHRhc2s7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogQ2xlYXJzIGEgc2NoZWR1bGVkICdyZWFkJyBvciAnd3JpdGUnIHRhc2suXHJcbiAgICpcclxuICAgKiBAcGFyYW0ge09iamVjdH0gdGFza1xyXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59IHN1Y2Nlc3NcclxuICAgKiBAcHVibGljXHJcbiAgICovXHJcbiAgY2xlYXI6IGZ1bmN0aW9uKHRhc2spIHtcclxuICAgIGRlYnVnKCdjbGVhcicsIHRhc2spO1xyXG4gICAgcmV0dXJuIHJlbW92ZSh0aGlzLnJlYWRzLCB0YXNrKSB8fCByZW1vdmUodGhpcy53cml0ZXMsIHRhc2spO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIEV4dGVuZCB0aGlzIEZhc3REb20gd2l0aCBzb21lXHJcbiAgICogY3VzdG9tIGZ1bmN0aW9uYWxpdHkuXHJcbiAgICpcclxuICAgKiBCZWNhdXNlIGZhc3Rkb20gbXVzdCAqYWx3YXlzKiBiZSBhXHJcbiAgICogc2luZ2xldG9uLCB3ZSdyZSBhY3R1YWxseSBleHRlbmRpbmdcclxuICAgKiB0aGUgZmFzdGRvbSBpbnN0YW5jZS4gVGhpcyBtZWFucyB0YXNrc1xyXG4gICAqIHNjaGVkdWxlZCBieSBhbiBleHRlbnNpb24gc3RpbGwgZW50ZXJcclxuICAgKiBmYXN0ZG9tJ3MgZ2xvYmFsIHRhc2sgcXVldWUuXHJcbiAgICpcclxuICAgKiBUaGUgJ3N1cGVyJyBpbnN0YW5jZSBjYW4gYmUgYWNjZXNzZWRcclxuICAgKiBmcm9tIGB0aGlzLmZhc3Rkb21gLlxyXG4gICAqXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIHZhciBteUZhc3Rkb20gPSBmYXN0ZG9tLmV4dGVuZCh7XHJcbiAgICogICBpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcclxuICAgKiAgICAgLy8gcnVucyBvbiBjcmVhdGlvblxyXG4gICAqICAgfSxcclxuICAgKlxyXG4gICAqICAgLy8gb3ZlcnJpZGUgYSBtZXRob2RcclxuICAgKiAgIG1lYXN1cmU6IGZ1bmN0aW9uKGZuKSB7XHJcbiAgICogICAgIC8vIGRvIGV4dHJhIHN0dWZmIC4uLlxyXG4gICAqXHJcbiAgICogICAgIC8vIHRoZW4gY2FsbCB0aGUgb3JpZ2luYWxcclxuICAgKiAgICAgcmV0dXJuIHRoaXMuZmFzdGRvbS5tZWFzdXJlKGZuKTtcclxuICAgKiAgIH0sXHJcbiAgICpcclxuICAgKiAgIC4uLlxyXG4gICAqIH0pO1xyXG4gICAqXHJcbiAgICogQHBhcmFtICB7T2JqZWN0fSBwcm9wcyAgcHJvcGVydGllcyB0byBtaXhpblxyXG4gICAqIEByZXR1cm4ge0Zhc3REb219XHJcbiAgICovXHJcbiAgZXh0ZW5kOiBmdW5jdGlvbihwcm9wcykge1xyXG4gICAgZGVidWcoJ2V4dGVuZCcsIHByb3BzKTtcclxuICAgIGlmICh0eXBlb2YgcHJvcHMgIT0gJ29iamVjdCcpIHRocm93IG5ldyBFcnJvcignZXhwZWN0ZWQgb2JqZWN0Jyk7XHJcblxyXG4gICAgdmFyIGNoaWxkID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcclxuICAgIG1peGluKGNoaWxkLCBwcm9wcyk7XHJcbiAgICBjaGlsZC5mYXN0ZG9tID0gdGhpcztcclxuXHJcbiAgICAvLyBydW4gb3B0aW9uYWwgY3JlYXRpb24gaG9va1xyXG4gICAgaWYgKGNoaWxkLmluaXRpYWxpemUpIGNoaWxkLmluaXRpYWxpemUoKTtcclxuXHJcbiAgICByZXR1cm4gY2hpbGQ7XHJcbiAgfSxcclxuXHJcbiAgLy8gb3ZlcnJpZGUgdGhpcyB3aXRoIGEgZnVuY3Rpb25cclxuICAvLyB0byBwcmV2ZW50IEVycm9ycyBpbiBjb25zb2xlXHJcbiAgLy8gd2hlbiB0YXNrcyB0aHJvd1xyXG4gIGNhdGNoOiBudWxsXHJcbn07XHJcblxyXG4vKipcclxuICogU2NoZWR1bGVzIGEgbmV3IHJlYWQvd3JpdGVcclxuICogYmF0Y2ggaWYgb25lIGlzbid0IHBlbmRpbmcuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5mdW5jdGlvbiBzY2hlZHVsZUZsdXNoKGZhc3Rkb20pIHtcclxuICBpZiAoIWZhc3Rkb20uc2NoZWR1bGVkKSB7XHJcbiAgICBmYXN0ZG9tLnNjaGVkdWxlZCA9IHRydWU7XHJcbiAgICBmYXN0ZG9tLnJhZihmbHVzaC5iaW5kKG51bGwsIGZhc3Rkb20pKTtcclxuICAgIGRlYnVnKCdmbHVzaCBzY2hlZHVsZWQnKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSdW5zIHF1ZXVlZCBgcmVhZGAgYW5kIGB3cml0ZWAgdGFza3MuXHJcbiAqXHJcbiAqIEVycm9ycyBhcmUgY2F1Z2h0IGFuZCB0aHJvd24gYnkgZGVmYXVsdC5cclxuICogSWYgYSBgLmNhdGNoYCBmdW5jdGlvbiBoYXMgYmVlbiBkZWZpbmVkXHJcbiAqIGl0IGlzIGNhbGxlZCBpbnN0ZWFkLlxyXG4gKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuZnVuY3Rpb24gZmx1c2goZmFzdGRvbSkge1xyXG4gIGRlYnVnKCdmbHVzaCcpO1xyXG5cclxuICB2YXIgd3JpdGVzID0gZmFzdGRvbS53cml0ZXM7XHJcbiAgdmFyIHJlYWRzID0gZmFzdGRvbS5yZWFkcztcclxuICB2YXIgZXJyb3I7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBkZWJ1ZygnZmx1c2hpbmcgcmVhZHMnLCByZWFkcy5sZW5ndGgpO1xyXG4gICAgcnVuVGFza3MocmVhZHMpO1xyXG4gICAgZGVidWcoJ2ZsdXNoaW5nIHdyaXRlcycsIHdyaXRlcy5sZW5ndGgpO1xyXG4gICAgcnVuVGFza3Mod3JpdGVzKTtcclxuICB9IGNhdGNoIChlKSB7IGVycm9yID0gZTsgfVxyXG5cclxuICBmYXN0ZG9tLnNjaGVkdWxlZCA9IGZhbHNlO1xyXG5cclxuICAvLyBJZiB0aGUgYmF0Y2ggZXJyb3JlZCB3ZSBtYXkgc3RpbGwgaGF2ZSB0YXNrcyBxdWV1ZWRcclxuICBpZiAocmVhZHMubGVuZ3RoIHx8IHdyaXRlcy5sZW5ndGgpIHNjaGVkdWxlRmx1c2goZmFzdGRvbSk7XHJcblxyXG4gIGlmIChlcnJvcikge1xyXG4gICAgZGVidWcoJ3Rhc2sgZXJyb3JlZCcsIGVycm9yLm1lc3NhZ2UpO1xyXG4gICAgaWYgKGZhc3Rkb20uY2F0Y2gpIGZhc3Rkb20uY2F0Y2goZXJyb3IpO1xyXG4gICAgZWxzZSB0aHJvdyBlcnJvcjtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBXZSBydW4gdGhpcyBpbnNpZGUgYSB0cnkgY2F0Y2hcclxuICogc28gdGhhdCBpZiBhbnkgam9icyBlcnJvciwgd2VcclxuICogYXJlIGFibGUgdG8gcmVjb3ZlciBhbmQgY29udGludWVcclxuICogdG8gZmx1c2ggdGhlIGJhdGNoIHVudGlsIGl0J3MgZW1wdHkuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5mdW5jdGlvbiBydW5UYXNrcyh0YXNrcykge1xyXG4gIGRlYnVnKCdydW4gdGFza3MnKTtcclxuICB2YXIgdGFzazsgd2hpbGUgKHRhc2sgPSB0YXNrcy5zaGlmdCgpKSB0YXNrKCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZW1vdmUgYW4gaXRlbSBmcm9tIGFuIEFycmF5LlxyXG4gKlxyXG4gKiBAcGFyYW0gIHtBcnJheX0gYXJyYXlcclxuICogQHBhcmFtICB7Kn0gaXRlbVxyXG4gKiBAcmV0dXJuIHtCb29sZWFufVxyXG4gKi9cclxuZnVuY3Rpb24gcmVtb3ZlKGFycmF5LCBpdGVtKSB7XHJcbiAgdmFyIGluZGV4ID0gYXJyYXkuaW5kZXhPZihpdGVtKTtcclxuICByZXR1cm4gISF+aW5kZXggJiYgISFhcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xyXG59XHJcblxyXG4vKipcclxuICogTWl4aW4gb3duIHByb3BlcnRpZXMgb2Ygc291cmNlXHJcbiAqIG9iamVjdCBpbnRvIHRoZSB0YXJnZXQuXHJcbiAqXHJcbiAqIEBwYXJhbSAge09iamVjdH0gdGFyZ2V0XHJcbiAqIEBwYXJhbSAge09iamVjdH0gc291cmNlXHJcbiAqL1xyXG5mdW5jdGlvbiBtaXhpbih0YXJnZXQsIHNvdXJjZSkge1xyXG4gIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcclxuICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFRoZXJlIHNob3VsZCBuZXZlciBiZSBtb3JlIHRoYW5cclxuLy8gb25lIGluc3RhbmNlIG9mIGBGYXN0RG9tYCBpbiBhbiBhcHBcclxudmFyIGV4cG9ydHMgPSB3aW4uZmFzdGRvbSA9ICh3aW4uZmFzdGRvbSB8fCBuZXcgRmFzdERvbSgpKTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXHJcblxyXG4vLyBFeHBvc2UgdG8gQ0pTICYgQU1EXHJcbmlmICgodHlwZW9mIGRlZmluZSlbMF0gPT0gJ2YnKSBkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBleHBvcnRzOyB9KTtcclxuZWxzZSBpZiAoKHR5cGVvZiBtb2R1bGUpWzBdID09ICdvJykgbW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzO1xyXG5cclxufSkoIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogdGhpcyk7XHJcbiIsIihmdW5jdGlvbigpe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIGEoYSl7dmFyIGIsYyxkLGUsZj1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMSk7Zm9yKGI9MCxjPWYubGVuZ3RoO2M+YjtiKz0xKWlmKGQ9ZltiXSlmb3IoZSBpbiBkKXAuY2FsbChkLGUpJiYoYVtlXT1kW2VdKTtyZXR1cm4gYX1mdW5jdGlvbiBiKGEsYixjKXt0aGlzLmxvY2FsZXM9YSx0aGlzLmZvcm1hdHM9Yix0aGlzLnBsdXJhbEZuPWN9ZnVuY3Rpb24gYyhhKXt0aGlzLmlkPWF9ZnVuY3Rpb24gZChhLGIsYyxkLGUpe3RoaXMuaWQ9YSx0aGlzLnVzZU9yZGluYWw9Yix0aGlzLm9mZnNldD1jLHRoaXMub3B0aW9ucz1kLHRoaXMucGx1cmFsRm49ZX1mdW5jdGlvbiBlKGEsYixjLGQpe3RoaXMuaWQ9YSx0aGlzLm9mZnNldD1iLHRoaXMubnVtYmVyRm9ybWF0PWMsdGhpcy5zdHJpbmc9ZH1mdW5jdGlvbiBmKGEsYil7dGhpcy5pZD1hLHRoaXMub3B0aW9ucz1ifWZ1bmN0aW9uIGcoYSxiLGMpe3ZhciBkPVwic3RyaW5nXCI9PXR5cGVvZiBhP2cuX19wYXJzZShhKTphO2lmKCFkfHxcIm1lc3NhZ2VGb3JtYXRQYXR0ZXJuXCIhPT1kLnR5cGUpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkEgbWVzc2FnZSBtdXN0IGJlIHByb3ZpZGVkIGFzIGEgU3RyaW5nIG9yIEFTVC5cIik7Yz10aGlzLl9tZXJnZUZvcm1hdHMoZy5mb3JtYXRzLGMpLHIodGhpcyxcIl9sb2NhbGVcIix7dmFsdWU6dGhpcy5fcmVzb2x2ZUxvY2FsZShiKX0pO3ZhciBlPXRoaXMuX2ZpbmRQbHVyYWxSdWxlRnVuY3Rpb24odGhpcy5fbG9jYWxlKSxmPXRoaXMuX2NvbXBpbGVQYXR0ZXJuKGQsYixjLGUpLGg9dGhpczt0aGlzLmZvcm1hdD1mdW5jdGlvbihhKXtyZXR1cm4gaC5fZm9ybWF0KGYsYSl9fWZ1bmN0aW9uIGgoYSl7cmV0dXJuIDQwMCphLzE0NjA5N31mdW5jdGlvbiBpKGEsYil7Yj1ifHx7fSxHKGEpJiYoYT1hLmNvbmNhdCgpKSxEKHRoaXMsXCJfbG9jYWxlXCIse3ZhbHVlOnRoaXMuX3Jlc29sdmVMb2NhbGUoYSl9KSxEKHRoaXMsXCJfb3B0aW9uc1wiLHt2YWx1ZTp7c3R5bGU6dGhpcy5fcmVzb2x2ZVN0eWxlKGIuc3R5bGUpLHVuaXRzOnRoaXMuX2lzVmFsaWRVbml0cyhiLnVuaXRzKSYmYi51bml0c319KSxEKHRoaXMsXCJfbG9jYWxlc1wiLHt2YWx1ZTphfSksRCh0aGlzLFwiX2ZpZWxkc1wiLHt2YWx1ZTp0aGlzLl9maW5kRmllbGRzKHRoaXMuX2xvY2FsZSl9KSxEKHRoaXMsXCJfbWVzc2FnZXNcIix7dmFsdWU6RShudWxsKX0pO3ZhciBjPXRoaXM7dGhpcy5mb3JtYXQ9ZnVuY3Rpb24oYSxiKXtyZXR1cm4gYy5fZm9ybWF0KGEsYil9fWZ1bmN0aW9uIGooYSl7dmFyIGI9UShudWxsKTtyZXR1cm4gZnVuY3Rpb24oKXt2YXIgYz1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLGQ9ayhjKSxlPWQmJmJbZF07cmV0dXJuIGV8fChlPVEoYS5wcm90b3R5cGUpLGEuYXBwbHkoZSxjKSxkJiYoYltkXT1lKSksZX19ZnVuY3Rpb24gayhhKXtpZihcInVuZGVmaW5lZFwiIT10eXBlb2YgSlNPTil7dmFyIGIsYyxkLGU9W107Zm9yKGI9MCxjPWEubGVuZ3RoO2M+YjtiKz0xKWQ9YVtiXSxlLnB1c2goZCYmXCJvYmplY3RcIj09dHlwZW9mIGQ/bChkKTpkKTtyZXR1cm4gSlNPTi5zdHJpbmdpZnkoZSl9fWZ1bmN0aW9uIGwoYSl7dmFyIGIsYyxkLGUsZj1bXSxnPVtdO2ZvcihiIGluIGEpYS5oYXNPd25Qcm9wZXJ0eShiKSYmZy5wdXNoKGIpO3ZhciBoPWcuc29ydCgpO2ZvcihjPTAsZD1oLmxlbmd0aDtkPmM7Yys9MSliPWhbY10sZT17fSxlW2JdPWFbYl0sZltjXT1lO3JldHVybiBmfWZ1bmN0aW9uIG0oYSl7dmFyIGIsYyxkLGUsZj1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMSk7Zm9yKGI9MCxjPWYubGVuZ3RoO2M+YjtiKz0xKWlmKGQ9ZltiXSlmb3IoZSBpbiBkKWQuaGFzT3duUHJvcGVydHkoZSkmJihhW2VdPWRbZV0pO3JldHVybiBhfWZ1bmN0aW9uIG4oYSl7ZnVuY3Rpb24gYihhLGIpe3JldHVybiBmdW5jdGlvbigpe3JldHVyblwidW5kZWZpbmVkXCIhPXR5cGVvZiBjb25zb2xlJiZcImZ1bmN0aW9uXCI9PXR5cGVvZiBjb25zb2xlLndhcm4mJmNvbnNvbGUud2FybihcInt7XCIrYStcIn19IGlzIGRlcHJlY2F0ZWQsIHVzZToge3tcIitiLm5hbWUrXCJ9fVwiKSxiLmFwcGx5KHRoaXMsYXJndW1lbnRzKX19ZnVuY3Rpb24gYyhhKXtpZighYS5mbil0aHJvdyBuZXcgRXJyb3IoXCJ7eyNpbnRsfX0gbXVzdCBiZSBpbnZva2VkIGFzIGEgYmxvY2sgaGVscGVyXCIpO3ZhciBiPXAoYS5kYXRhKSxjPW0oe30sYi5pbnRsLGEuaGFzaCk7cmV0dXJuIGIuaW50bD1jLGEuZm4odGhpcyx7ZGF0YTpifSl9ZnVuY3Rpb24gZChhLGIpe3ZhciBjLGQsZSxmPWIuZGF0YSYmYi5kYXRhLmludGwsZz1hLnNwbGl0KFwiLlwiKTt0cnl7Zm9yKGU9MCxkPWcubGVuZ3RoO2Q+ZTtlKyspYz1mPWZbZ1tlXV19ZmluYWxseXtpZih2b2lkIDA9PT1jKXRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcIkNvdWxkIG5vdCBmaW5kIEludGwgb2JqZWN0OiBcIithKX1yZXR1cm4gY31mdW5jdGlvbiBlKGEsYixjKXthPW5ldyBEYXRlKGEpLGsoYSxcIkEgZGF0ZSBvciB0aW1lc3RhbXAgbXVzdCBiZSBwcm92aWRlZCB0byB7e2Zvcm1hdERhdGV9fVwiKSxjfHwoYz1iLGI9bnVsbCk7dmFyIGQ9Yy5kYXRhLmludGwmJmMuZGF0YS5pbnRsLmxvY2FsZXMsZT1uKFwiZGF0ZVwiLGIsYyk7cmV0dXJuIFQoZCxlKS5mb3JtYXQoYSl9ZnVuY3Rpb24gZihhLGIsYyl7YT1uZXcgRGF0ZShhKSxrKGEsXCJBIGRhdGUgb3IgdGltZXN0YW1wIG11c3QgYmUgcHJvdmlkZWQgdG8ge3tmb3JtYXRUaW1lfX1cIiksY3x8KGM9YixiPW51bGwpO3ZhciBkPWMuZGF0YS5pbnRsJiZjLmRhdGEuaW50bC5sb2NhbGVzLGU9bihcInRpbWVcIixiLGMpO3JldHVybiBUKGQsZSkuZm9ybWF0KGEpfWZ1bmN0aW9uIGcoYSxiLGMpe2E9bmV3IERhdGUoYSksayhhLFwiQSBkYXRlIG9yIHRpbWVzdGFtcCBtdXN0IGJlIHByb3ZpZGVkIHRvIHt7Zm9ybWF0UmVsYXRpdmV9fVwiKSxjfHwoYz1iLGI9bnVsbCk7dmFyIGQ9Yy5kYXRhLmludGwmJmMuZGF0YS5pbnRsLmxvY2FsZXMsZT1uKFwicmVsYXRpdmVcIixiLGMpLGY9Yy5oYXNoLm5vdztyZXR1cm4gZGVsZXRlIGUubm93LFYoZCxlKS5mb3JtYXQoYSx7bm93OmZ9KX1mdW5jdGlvbiBoKGEsYixjKXtsKGEsXCJBIG51bWJlciBtdXN0IGJlIHByb3ZpZGVkIHRvIHt7Zm9ybWF0TnVtYmVyfX1cIiksY3x8KGM9YixiPW51bGwpO3ZhciBkPWMuZGF0YS5pbnRsJiZjLmRhdGEuaW50bC5sb2NhbGVzLGU9bihcIm51bWJlclwiLGIsYyk7cmV0dXJuIFMoZCxlKS5mb3JtYXQoYSl9ZnVuY3Rpb24gaShhLGIpe2J8fChiPWEsYT1udWxsKTt2YXIgYz1iLmhhc2g7aWYoIWEmJlwic3RyaW5nXCIhPXR5cGVvZiBhJiYhYy5pbnRsTmFtZSl0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ7e2Zvcm1hdE1lc3NhZ2V9fSBtdXN0IGJlIHByb3ZpZGVkIGEgbWVzc2FnZSBvciBpbnRsTmFtZVwiKTt2YXIgZT1iLmRhdGEuaW50bHx8e30sZj1lLmxvY2FsZXMsZz1lLmZvcm1hdHM7cmV0dXJuIWEmJmMuaW50bE5hbWUmJihhPWQoYy5pbnRsTmFtZSxiKSksXCJmdW5jdGlvblwiPT10eXBlb2YgYT9hKGMpOihcInN0cmluZ1wiPT10eXBlb2YgYSYmKGE9VShhLGYsZykpLGEuZm9ybWF0KGMpKX1mdW5jdGlvbiBqKCl7dmFyIGEsYixjPVtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKS5wb3AoKSxkPWMuaGFzaDtmb3IoYSBpbiBkKWQuaGFzT3duUHJvcGVydHkoYSkmJihiPWRbYV0sXCJzdHJpbmdcIj09dHlwZW9mIGImJihkW2FdPXEoYikpKTtyZXR1cm4gbmV3IG8oU3RyaW5nKGkuYXBwbHkodGhpcyxhcmd1bWVudHMpKSl9ZnVuY3Rpb24gayhhLGIpe2lmKCFpc0Zpbml0ZShhKSl0aHJvdyBuZXcgVHlwZUVycm9yKGIpfWZ1bmN0aW9uIGwoYSxiKXtpZihcIm51bWJlclwiIT10eXBlb2YgYSl0aHJvdyBuZXcgVHlwZUVycm9yKGIpfWZ1bmN0aW9uIG4oYSxiLGMpe3ZhciBlLGY9Yy5oYXNoO3JldHVybiBiPyhcInN0cmluZ1wiPT10eXBlb2YgYiYmKGU9ZChcImZvcm1hdHMuXCIrYStcIi5cIitiLGMpKSxlPW0oe30sZSxmKSk6ZT1mLGV9dmFyIG89YS5TYWZlU3RyaW5nLHA9YS5jcmVhdGVGcmFtZSxxPWEuVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixyPXtpbnRsOmMsaW50bEdldDpkLGZvcm1hdERhdGU6ZSxmb3JtYXRUaW1lOmYsZm9ybWF0UmVsYXRpdmU6Zyxmb3JtYXROdW1iZXI6aCxmb3JtYXRNZXNzYWdlOmksZm9ybWF0SFRNTE1lc3NhZ2U6aixpbnRsRGF0ZTpiKFwiaW50bERhdGVcIixlKSxpbnRsVGltZTpiKFwiaW50bFRpbWVcIixmKSxpbnRsTnVtYmVyOmIoXCJpbnRsTnVtYmVyXCIsaCksaW50bE1lc3NhZ2U6YihcImludGxNZXNzYWdlXCIsaSksaW50bEhUTUxNZXNzYWdlOmIoXCJpbnRsSFRNTE1lc3NhZ2VcIixqKX07Zm9yKHZhciBzIGluIHIpci5oYXNPd25Qcm9wZXJ0eShzKSYmYS5yZWdpc3RlckhlbHBlcihzLHJbc10pfWZ1bmN0aW9uIG8oYSl7eC5fX2FkZExvY2FsZURhdGEoYSksTS5fX2FkZExvY2FsZURhdGEoYSl9dmFyIHA9T2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSxxPWZ1bmN0aW9uKCl7dHJ5e3JldHVybiEhT2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LFwiYVwiLHt9KX1jYXRjaChhKXtyZXR1cm4hMX19KCkscj0oIXEmJiFPYmplY3QucHJvdG90eXBlLl9fZGVmaW5lR2V0dGVyX18scT9PYmplY3QuZGVmaW5lUHJvcGVydHk6ZnVuY3Rpb24oYSxiLGMpe1wiZ2V0XCJpbiBjJiZhLl9fZGVmaW5lR2V0dGVyX18/YS5fX2RlZmluZUdldHRlcl9fKGIsYy5nZXQpOighcC5jYWxsKGEsYil8fFwidmFsdWVcImluIGMpJiYoYVtiXT1jLnZhbHVlKX0pLHM9T2JqZWN0LmNyZWF0ZXx8ZnVuY3Rpb24oYSxiKXtmdW5jdGlvbiBjKCl7fXZhciBkLGU7Yy5wcm90b3R5cGU9YSxkPW5ldyBjO2ZvcihlIGluIGIpcC5jYWxsKGIsZSkmJnIoZCxlLGJbZV0pO3JldHVybiBkfSx0PWI7Yi5wcm90b3R5cGUuY29tcGlsZT1mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5wbHVyYWxTdGFjaz1bXSx0aGlzLmN1cnJlbnRQbHVyYWw9bnVsbCx0aGlzLnBsdXJhbE51bWJlckZvcm1hdD1udWxsLHRoaXMuY29tcGlsZU1lc3NhZ2UoYSl9LGIucHJvdG90eXBlLmNvbXBpbGVNZXNzYWdlPWZ1bmN0aW9uKGEpe2lmKCFhfHxcIm1lc3NhZ2VGb3JtYXRQYXR0ZXJuXCIhPT1hLnR5cGUpdGhyb3cgbmV3IEVycm9yKCdNZXNzYWdlIEFTVCBpcyBub3Qgb2YgdHlwZTogXCJtZXNzYWdlRm9ybWF0UGF0dGVyblwiJyk7dmFyIGIsYyxkLGU9YS5lbGVtZW50cyxmPVtdO2ZvcihiPTAsYz1lLmxlbmd0aDtjPmI7Yis9MSlzd2l0Y2goZD1lW2JdLGQudHlwZSl7Y2FzZVwibWVzc2FnZVRleHRFbGVtZW50XCI6Zi5wdXNoKHRoaXMuY29tcGlsZU1lc3NhZ2VUZXh0KGQpKTticmVhaztjYXNlXCJhcmd1bWVudEVsZW1lbnRcIjpmLnB1c2godGhpcy5jb21waWxlQXJndW1lbnQoZCkpO2JyZWFrO2RlZmF1bHQ6dGhyb3cgbmV3IEVycm9yKFwiTWVzc2FnZSBlbGVtZW50IGRvZXMgbm90IGhhdmUgYSB2YWxpZCB0eXBlXCIpfXJldHVybiBmfSxiLnByb3RvdHlwZS5jb21waWxlTWVzc2FnZVRleHQ9ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuY3VycmVudFBsdXJhbCYmLyhefFteXFxcXF0pIy9nLnRlc3QoYS52YWx1ZSk/KHRoaXMucGx1cmFsTnVtYmVyRm9ybWF0fHwodGhpcy5wbHVyYWxOdW1iZXJGb3JtYXQ9bmV3IEludGwuTnVtYmVyRm9ybWF0KHRoaXMubG9jYWxlcykpLG5ldyBlKHRoaXMuY3VycmVudFBsdXJhbC5pZCx0aGlzLmN1cnJlbnRQbHVyYWwuZm9ybWF0Lm9mZnNldCx0aGlzLnBsdXJhbE51bWJlckZvcm1hdCxhLnZhbHVlKSk6YS52YWx1ZS5yZXBsYWNlKC9cXFxcIy9nLFwiI1wiKX0sYi5wcm90b3R5cGUuY29tcGlsZUFyZ3VtZW50PWZ1bmN0aW9uKGEpe3ZhciBiPWEuZm9ybWF0O2lmKCFiKXJldHVybiBuZXcgYyhhLmlkKTt2YXIgZSxnPXRoaXMuZm9ybWF0cyxoPXRoaXMubG9jYWxlcyxpPXRoaXMucGx1cmFsRm47c3dpdGNoKGIudHlwZSl7Y2FzZVwibnVtYmVyRm9ybWF0XCI6cmV0dXJuIGU9Zy5udW1iZXJbYi5zdHlsZV0se2lkOmEuaWQsZm9ybWF0Om5ldyBJbnRsLk51bWJlckZvcm1hdChoLGUpLmZvcm1hdH07Y2FzZVwiZGF0ZUZvcm1hdFwiOnJldHVybiBlPWcuZGF0ZVtiLnN0eWxlXSx7aWQ6YS5pZCxmb3JtYXQ6bmV3IEludGwuRGF0ZVRpbWVGb3JtYXQoaCxlKS5mb3JtYXR9O2Nhc2VcInRpbWVGb3JtYXRcIjpyZXR1cm4gZT1nLnRpbWVbYi5zdHlsZV0se2lkOmEuaWQsZm9ybWF0Om5ldyBJbnRsLkRhdGVUaW1lRm9ybWF0KGgsZSkuZm9ybWF0fTtjYXNlXCJwbHVyYWxGb3JtYXRcIjpyZXR1cm4gZT10aGlzLmNvbXBpbGVPcHRpb25zKGEpLG5ldyBkKGEuaWQsYi5vcmRpbmFsLGIub2Zmc2V0LGUsaSk7Y2FzZVwic2VsZWN0Rm9ybWF0XCI6cmV0dXJuIGU9dGhpcy5jb21waWxlT3B0aW9ucyhhKSxuZXcgZihhLmlkLGUpO2RlZmF1bHQ6dGhyb3cgbmV3IEVycm9yKFwiTWVzc2FnZSBlbGVtZW50IGRvZXMgbm90IGhhdmUgYSB2YWxpZCBmb3JtYXQgdHlwZVwiKX19LGIucHJvdG90eXBlLmNvbXBpbGVPcHRpb25zPWZ1bmN0aW9uKGEpe3ZhciBiPWEuZm9ybWF0LGM9Yi5vcHRpb25zLGQ9e307dGhpcy5wbHVyYWxTdGFjay5wdXNoKHRoaXMuY3VycmVudFBsdXJhbCksdGhpcy5jdXJyZW50UGx1cmFsPVwicGx1cmFsRm9ybWF0XCI9PT1iLnR5cGU/YTpudWxsO3ZhciBlLGYsZztmb3IoZT0wLGY9Yy5sZW5ndGg7Zj5lO2UrPTEpZz1jW2VdLGRbZy5zZWxlY3Rvcl09dGhpcy5jb21waWxlTWVzc2FnZShnLnZhbHVlKTtyZXR1cm4gdGhpcy5jdXJyZW50UGx1cmFsPXRoaXMucGx1cmFsU3RhY2sucG9wKCksZH0sYy5wcm90b3R5cGUuZm9ybWF0PWZ1bmN0aW9uKGEpe3JldHVybiBhP1wic3RyaW5nXCI9PXR5cGVvZiBhP2E6U3RyaW5nKGEpOlwiXCJ9LGQucHJvdG90eXBlLmdldE9wdGlvbj1mdW5jdGlvbihhKXt2YXIgYj10aGlzLm9wdGlvbnMsYz1iW1wiPVwiK2FdfHxiW3RoaXMucGx1cmFsRm4oYS10aGlzLm9mZnNldCx0aGlzLnVzZU9yZGluYWwpXTtyZXR1cm4gY3x8Yi5vdGhlcn0sZS5wcm90b3R5cGUuZm9ybWF0PWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMubnVtYmVyRm9ybWF0LmZvcm1hdChhLXRoaXMub2Zmc2V0KTtyZXR1cm4gdGhpcy5zdHJpbmcucmVwbGFjZSgvKF58W15cXFxcXSkjL2csXCIkMVwiK2IpLnJlcGxhY2UoL1xcXFwjL2csXCIjXCIpfSxmLnByb3RvdHlwZS5nZXRPcHRpb249ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcy5vcHRpb25zO3JldHVybiBiW2FdfHxiLm90aGVyfTt2YXIgdT1mdW5jdGlvbigpe2Z1bmN0aW9uIGEoYSxiKXtmdW5jdGlvbiBjKCl7dGhpcy5jb25zdHJ1Y3Rvcj1hfWMucHJvdG90eXBlPWIucHJvdG90eXBlLGEucHJvdG90eXBlPW5ldyBjfWZ1bmN0aW9uIGIoYSxiLGMsZCxlLGYpe3RoaXMubWVzc2FnZT1hLHRoaXMuZXhwZWN0ZWQ9Yix0aGlzLmZvdW5kPWMsdGhpcy5vZmZzZXQ9ZCx0aGlzLmxpbmU9ZSx0aGlzLmNvbHVtbj1mLHRoaXMubmFtZT1cIlN5bnRheEVycm9yXCJ9ZnVuY3Rpb24gYyhhKXtmdW5jdGlvbiBjKGIpe2Z1bmN0aW9uIGMoYixjLGQpe3ZhciBlLGY7Zm9yKGU9YztkPmU7ZSsrKWY9YS5jaGFyQXQoZSksXCJcXG5cIj09PWY/KGIuc2VlbkNSfHxiLmxpbmUrKyxiLmNvbHVtbj0xLGIuc2VlbkNSPSExKTpcIlxcclwiPT09Znx8XCJcXHUyMDI4XCI9PT1mfHxcIlxcdTIwMjlcIj09PWY/KGIubGluZSsrLGIuY29sdW1uPTEsYi5zZWVuQ1I9ITApOihiLmNvbHVtbisrLGIuc2VlbkNSPSExKX1yZXR1cm4gVWEhPT1iJiYoVWE+YiYmKFVhPTAsVmE9e2xpbmU6MSxjb2x1bW46MSxzZWVuQ1I6ITF9KSxjKFZhLFVhLGIpLFVhPWIpLFZhfWZ1bmN0aW9uIGQoYSl7V2E+U2F8fChTYT5XYSYmKFdhPVNhLFhhPVtdKSxYYS5wdXNoKGEpKX1mdW5jdGlvbiBlKGQsZSxmKXtmdW5jdGlvbiBnKGEpe3ZhciBiPTE7Zm9yKGEuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiBhLmRlc2NyaXB0aW9uPGIuZGVzY3JpcHRpb24/LTE6YS5kZXNjcmlwdGlvbj5iLmRlc2NyaXB0aW9uPzE6MH0pO2I8YS5sZW5ndGg7KWFbYi0xXT09PWFbYl0/YS5zcGxpY2UoYiwxKTpiKyt9ZnVuY3Rpb24gaChhLGIpe2Z1bmN0aW9uIGMoYSl7ZnVuY3Rpb24gYihhKXtyZXR1cm4gYS5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpfXJldHVybiBhLnJlcGxhY2UoL1xcXFwvZyxcIlxcXFxcXFxcXCIpLnJlcGxhY2UoL1wiL2csJ1xcXFxcIicpLnJlcGxhY2UoL1xceDA4L2csXCJcXFxcYlwiKS5yZXBsYWNlKC9cXHQvZyxcIlxcXFx0XCIpLnJlcGxhY2UoL1xcbi9nLFwiXFxcXG5cIikucmVwbGFjZSgvXFxmL2csXCJcXFxcZlwiKS5yZXBsYWNlKC9cXHIvZyxcIlxcXFxyXCIpLnJlcGxhY2UoL1tcXHgwMC1cXHgwN1xceDBCXFx4MEVcXHgwRl0vZyxmdW5jdGlvbihhKXtyZXR1cm5cIlxcXFx4MFwiK2IoYSl9KS5yZXBsYWNlKC9bXFx4MTAtXFx4MUZcXHg4MC1cXHhGRl0vZyxmdW5jdGlvbihhKXtyZXR1cm5cIlxcXFx4XCIrYihhKX0pLnJlcGxhY2UoL1tcXHUwMTgwLVxcdTBGRkZdL2csZnVuY3Rpb24oYSl7cmV0dXJuXCJcXFxcdTBcIitiKGEpfSkucmVwbGFjZSgvW1xcdTEwODAtXFx1RkZGRl0vZyxmdW5jdGlvbihhKXtyZXR1cm5cIlxcXFx1XCIrYihhKX0pfXZhciBkLGUsZixnPW5ldyBBcnJheShhLmxlbmd0aCk7Zm9yKGY9MDtmPGEubGVuZ3RoO2YrKylnW2ZdPWFbZl0uZGVzY3JpcHRpb247cmV0dXJuIGQ9YS5sZW5ndGg+MT9nLnNsaWNlKDAsLTEpLmpvaW4oXCIsIFwiKStcIiBvciBcIitnW2EubGVuZ3RoLTFdOmdbMF0sZT1iPydcIicrYyhiKSsnXCInOlwiZW5kIG9mIGlucHV0XCIsXCJFeHBlY3RlZCBcIitkK1wiIGJ1dCBcIitlK1wiIGZvdW5kLlwifXZhciBpPWMoZiksaj1mPGEubGVuZ3RoP2EuY2hhckF0KGYpOm51bGw7cmV0dXJuIG51bGwhPT1lJiZnKGUpLG5ldyBiKG51bGwhPT1kP2Q6aChlLGopLGUsaixmLGkubGluZSxpLmNvbHVtbil9ZnVuY3Rpb24gZigpe3ZhciBhO3JldHVybiBhPWcoKX1mdW5jdGlvbiBnKCl7dmFyIGEsYixjO2ZvcihhPVNhLGI9W10sYz1oKCk7YyE9PUU7KWIucHVzaChjKSxjPWgoKTtyZXR1cm4gYiE9PUUmJihUYT1hLGI9SChiKSksYT1ifWZ1bmN0aW9uIGgoKXt2YXIgYTtyZXR1cm4gYT1qKCksYT09PUUmJihhPWwoKSksYX1mdW5jdGlvbiBpKCl7dmFyIGIsYyxkLGUsZixnO2lmKGI9U2EsYz1bXSxkPVNhLGU9dygpLGUhPT1FPyhmPUIoKSxmIT09RT8oZz13KCksZyE9PUU/KGU9W2UsZixnXSxkPWUpOihTYT1kLGQ9SSkpOihTYT1kLGQ9SSkpOihTYT1kLGQ9SSksZCE9PUUpZm9yKDtkIT09RTspYy5wdXNoKGQpLGQ9U2EsZT13KCksZSE9PUU/KGY9QigpLGYhPT1FPyhnPXcoKSxnIT09RT8oZT1bZSxmLGddLGQ9ZSk6KFNhPWQsZD1JKSk6KFNhPWQsZD1JKSk6KFNhPWQsZD1JKTtlbHNlIGM9STtyZXR1cm4gYyE9PUUmJihUYT1iLGM9SihjKSksYj1jLGI9PT1FJiYoYj1TYSxjPXYoKSxjIT09RSYmKGM9YS5zdWJzdHJpbmcoYixTYSkpLGI9YyksYn1mdW5jdGlvbiBqKCl7dmFyIGEsYjtyZXR1cm4gYT1TYSxiPWkoKSxiIT09RSYmKFRhPWEsYj1LKGIpKSxhPWJ9ZnVuY3Rpb24gaygpe3ZhciBiLGMsZTtpZihiPXooKSxiPT09RSl7aWYoYj1TYSxjPVtdLEwudGVzdChhLmNoYXJBdChTYSkpPyhlPWEuY2hhckF0KFNhKSxTYSsrKTooZT1FLDA9PT1ZYSYmZChNKSksZSE9PUUpZm9yKDtlIT09RTspYy5wdXNoKGUpLEwudGVzdChhLmNoYXJBdChTYSkpPyhlPWEuY2hhckF0KFNhKSxTYSsrKTooZT1FLDA9PT1ZYSYmZChNKSk7ZWxzZSBjPUk7YyE9PUUmJihjPWEuc3Vic3RyaW5nKGIsU2EpKSxiPWN9cmV0dXJuIGJ9ZnVuY3Rpb24gbCgpe3ZhciBiLGMsZSxmLGcsaCxpLGosbDtyZXR1cm4gYj1TYSwxMjM9PT1hLmNoYXJDb2RlQXQoU2EpPyhjPU4sU2ErKyk6KGM9RSwwPT09WWEmJmQoTykpLGMhPT1FPyhlPXcoKSxlIT09RT8oZj1rKCksZiE9PUU/KGc9dygpLGchPT1FPyhoPVNhLDQ0PT09YS5jaGFyQ29kZUF0KFNhKT8oaT1RLFNhKyspOihpPUUsMD09PVlhJiZkKFIpKSxpIT09RT8oaj13KCksaiE9PUU/KGw9bSgpLGwhPT1FPyhpPVtpLGosbF0saD1pKTooU2E9aCxoPUkpKTooU2E9aCxoPUkpKTooU2E9aCxoPUkpLGg9PT1FJiYoaD1QKSxoIT09RT8oaT13KCksaSE9PUU/KDEyNT09PWEuY2hhckNvZGVBdChTYSk/KGo9UyxTYSsrKTooaj1FLDA9PT1ZYSYmZChUKSksaiE9PUU/KFRhPWIsYz1VKGYsaCksYj1jKTooU2E9YixiPUkpKTooU2E9YixiPUkpKTooU2E9YixiPUkpKTooU2E9YixiPUkpKTooU2E9YixiPUkpKTooU2E9YixiPUkpKTooU2E9YixiPUkpLGJ9ZnVuY3Rpb24gbSgpe3ZhciBhO3JldHVybiBhPW4oKSxhPT09RSYmKGE9bygpLGE9PT1FJiYoYT1wKCksYT09PUUmJihhPXEoKSkpKSxhfWZ1bmN0aW9uIG4oKXt2YXIgYixjLGUsZixnLGgsaTtyZXR1cm4gYj1TYSxhLnN1YnN0cihTYSw2KT09PVY/KGM9VixTYSs9Nik6KGM9RSwwPT09WWEmJmQoVykpLGM9PT1FJiYoYS5zdWJzdHIoU2EsNCk9PT1YPyhjPVgsU2ErPTQpOihjPUUsMD09PVlhJiZkKFkpKSxjPT09RSYmKGEuc3Vic3RyKFNhLDQpPT09Wj8oYz1aLFNhKz00KTooYz1FLDA9PT1ZYSYmZCgkKSkpKSxjIT09RT8oZT13KCksZSE9PUU/KGY9U2EsNDQ9PT1hLmNoYXJDb2RlQXQoU2EpPyhnPVEsU2ErKyk6KGc9RSwwPT09WWEmJmQoUikpLGchPT1FPyhoPXcoKSxoIT09RT8oaT1CKCksaSE9PUU/KGc9W2csaCxpXSxmPWcpOihTYT1mLGY9SSkpOihTYT1mLGY9SSkpOihTYT1mLGY9SSksZj09PUUmJihmPVApLGYhPT1FPyhUYT1iLGM9XyhjLGYpLGI9Yyk6KFNhPWIsYj1JKSk6KFNhPWIsYj1JKSk6KFNhPWIsYj1JKSxifWZ1bmN0aW9uIG8oKXt2YXIgYixjLGUsZixnLGg7cmV0dXJuIGI9U2EsYS5zdWJzdHIoU2EsNik9PT1hYT8oYz1hYSxTYSs9Nik6KGM9RSwwPT09WWEmJmQoYmEpKSxjIT09RT8oZT13KCksZSE9PUU/KDQ0PT09YS5jaGFyQ29kZUF0KFNhKT8oZj1RLFNhKyspOihmPUUsMD09PVlhJiZkKFIpKSxmIT09RT8oZz13KCksZyE9PUU/KGg9dSgpLGghPT1FPyhUYT1iLGM9Y2EoaCksYj1jKTooU2E9YixiPUkpKTooU2E9YixiPUkpKTooU2E9YixiPUkpKTooU2E9YixiPUkpKTooU2E9YixiPUkpLGJ9ZnVuY3Rpb24gcCgpe3ZhciBiLGMsZSxmLGcsaDtyZXR1cm4gYj1TYSxhLnN1YnN0cihTYSwxMyk9PT1kYT8oYz1kYSxTYSs9MTMpOihjPUUsMD09PVlhJiZkKGVhKSksYyE9PUU/KGU9dygpLGUhPT1FPyg0ND09PWEuY2hhckNvZGVBdChTYSk/KGY9USxTYSsrKTooZj1FLDA9PT1ZYSYmZChSKSksZiE9PUU/KGc9dygpLGchPT1FPyhoPXUoKSxoIT09RT8oVGE9YixjPWZhKGgpLGI9Yyk6KFNhPWIsYj1JKSk6KFNhPWIsYj1JKSk6KFNhPWIsYj1JKSk6KFNhPWIsYj1JKSk6KFNhPWIsYj1JKSxifWZ1bmN0aW9uIHEoKXt2YXIgYixjLGUsZixnLGgsaTtpZihiPVNhLGEuc3Vic3RyKFNhLDYpPT09Z2E/KGM9Z2EsU2ErPTYpOihjPUUsMD09PVlhJiZkKGhhKSksYyE9PUUpaWYoZT13KCksZSE9PUUpaWYoNDQ9PT1hLmNoYXJDb2RlQXQoU2EpPyhmPVEsU2ErKyk6KGY9RSwwPT09WWEmJmQoUikpLGYhPT1FKWlmKGc9dygpLGchPT1FKXtpZihoPVtdLGk9cygpLGkhPT1FKWZvcig7aSE9PUU7KWgucHVzaChpKSxpPXMoKTtlbHNlIGg9STtoIT09RT8oVGE9YixjPWlhKGgpLGI9Yyk6KFNhPWIsYj1JKX1lbHNlIFNhPWIsYj1JO2Vsc2UgU2E9YixiPUk7ZWxzZSBTYT1iLGI9STtlbHNlIFNhPWIsYj1JO3JldHVybiBifWZ1bmN0aW9uIHIoKXt2YXIgYixjLGUsZjtyZXR1cm4gYj1TYSxjPVNhLDYxPT09YS5jaGFyQ29kZUF0KFNhKT8oZT1qYSxTYSsrKTooZT1FLDA9PT1ZYSYmZChrYSkpLGUhPT1FPyhmPXooKSxmIT09RT8oZT1bZSxmXSxjPWUpOihTYT1jLGM9SSkpOihTYT1jLGM9SSksYyE9PUUmJihjPWEuc3Vic3RyaW5nKGIsU2EpKSxiPWMsYj09PUUmJihiPUIoKSksYn1mdW5jdGlvbiBzKCl7dmFyIGIsYyxlLGYsaCxpLGosayxsO3JldHVybiBiPVNhLGM9dygpLGMhPT1FPyhlPXIoKSxlIT09RT8oZj13KCksZiE9PUU/KDEyMz09PWEuY2hhckNvZGVBdChTYSk/KGg9TixTYSsrKTooaD1FLDA9PT1ZYSYmZChPKSksaCE9PUU/KGk9dygpLGkhPT1FPyhqPWcoKSxqIT09RT8oaz13KCksayE9PUU/KDEyNT09PWEuY2hhckNvZGVBdChTYSk/KGw9UyxTYSsrKToobD1FLDA9PT1ZYSYmZChUKSksbCE9PUU/KFRhPWIsYz1sYShlLGopLGI9Yyk6KFNhPWIsYj1JKSk6KFNhPWIsYj1JKSk6KFNhPWIsYj1JKSk6KFNhPWIsYj1JKSk6KFNhPWIsYj1JKSk6KFNhPWIsYj1JKSk6KFNhPWIsYj1JKSk6KFNhPWIsYj1JKSxifWZ1bmN0aW9uIHQoKXt2YXIgYixjLGUsZjtyZXR1cm4gYj1TYSxhLnN1YnN0cihTYSw3KT09PW1hPyhjPW1hLFNhKz03KTooYz1FLDA9PT1ZYSYmZChuYSkpLGMhPT1FPyhlPXcoKSxlIT09RT8oZj16KCksZiE9PUU/KFRhPWIsYz1vYShmKSxiPWMpOihTYT1iLGI9SSkpOihTYT1iLGI9SSkpOihTYT1iLGI9SSksYn1mdW5jdGlvbiB1KCl7dmFyIGEsYixjLGQsZTtpZihhPVNhLGI9dCgpLGI9PT1FJiYoYj1QKSxiIT09RSlpZihjPXcoKSxjIT09RSl7aWYoZD1bXSxlPXMoKSxlIT09RSlmb3IoO2UhPT1FOylkLnB1c2goZSksZT1zKCk7ZWxzZSBkPUk7ZCE9PUU/KFRhPWEsYj1wYShiLGQpLGE9Yik6KFNhPWEsYT1JKX1lbHNlIFNhPWEsYT1JO2Vsc2UgU2E9YSxhPUk7cmV0dXJuIGF9ZnVuY3Rpb24gdigpe3ZhciBiLGM7aWYoWWErKyxiPVtdLHJhLnRlc3QoYS5jaGFyQXQoU2EpKT8oYz1hLmNoYXJBdChTYSksU2ErKyk6KGM9RSwwPT09WWEmJmQoc2EpKSxjIT09RSlmb3IoO2MhPT1FOyliLnB1c2goYykscmEudGVzdChhLmNoYXJBdChTYSkpPyhjPWEuY2hhckF0KFNhKSxTYSsrKTooYz1FLDA9PT1ZYSYmZChzYSkpO2Vsc2UgYj1JO3JldHVybiBZYS0tLGI9PT1FJiYoYz1FLDA9PT1ZYSYmZChxYSkpLGJ9ZnVuY3Rpb24gdygpe3ZhciBiLGMsZTtmb3IoWWErKyxiPVNhLGM9W10sZT12KCk7ZSE9PUU7KWMucHVzaChlKSxlPXYoKTtyZXR1cm4gYyE9PUUmJihjPWEuc3Vic3RyaW5nKGIsU2EpKSxiPWMsWWEtLSxiPT09RSYmKGM9RSwwPT09WWEmJmQodGEpKSxifWZ1bmN0aW9uIHgoKXt2YXIgYjtyZXR1cm4gdWEudGVzdChhLmNoYXJBdChTYSkpPyhiPWEuY2hhckF0KFNhKSxTYSsrKTooYj1FLDA9PT1ZYSYmZCh2YSkpLGJ9ZnVuY3Rpb24geSgpe3ZhciBiO3JldHVybiB3YS50ZXN0KGEuY2hhckF0KFNhKSk/KGI9YS5jaGFyQXQoU2EpLFNhKyspOihiPUUsMD09PVlhJiZkKHhhKSksYn1mdW5jdGlvbiB6KCl7dmFyIGIsYyxlLGYsZyxoO2lmKGI9U2EsNDg9PT1hLmNoYXJDb2RlQXQoU2EpPyhjPXlhLFNhKyspOihjPUUsMD09PVlhJiZkKHphKSksYz09PUUpe2lmKGM9U2EsZT1TYSxBYS50ZXN0KGEuY2hhckF0KFNhKSk/KGY9YS5jaGFyQXQoU2EpLFNhKyspOihmPUUsMD09PVlhJiZkKEJhKSksZiE9PUUpe2ZvcihnPVtdLGg9eCgpO2ghPT1FOylnLnB1c2goaCksaD14KCk7ZyE9PUU/KGY9W2YsZ10sZT1mKTooU2E9ZSxlPUkpfWVsc2UgU2E9ZSxlPUk7ZSE9PUUmJihlPWEuc3Vic3RyaW5nKGMsU2EpKSxjPWV9cmV0dXJuIGMhPT1FJiYoVGE9YixjPUNhKGMpKSxiPWN9ZnVuY3Rpb24gQSgpe3ZhciBiLGMsZSxmLGcsaCxpLGo7cmV0dXJuIERhLnRlc3QoYS5jaGFyQXQoU2EpKT8oYj1hLmNoYXJBdChTYSksU2ErKyk6KGI9RSwwPT09WWEmJmQoRWEpKSxiPT09RSYmKGI9U2EsYS5zdWJzdHIoU2EsMik9PT1GYT8oYz1GYSxTYSs9Mik6KGM9RSwwPT09WWEmJmQoR2EpKSxjIT09RSYmKFRhPWIsYz1IYSgpKSxiPWMsYj09PUUmJihiPVNhLGEuc3Vic3RyKFNhLDIpPT09SWE/KGM9SWEsU2ErPTIpOihjPUUsMD09PVlhJiZkKEphKSksYyE9PUUmJihUYT1iLGM9S2EoKSksYj1jLGI9PT1FJiYoYj1TYSxhLnN1YnN0cihTYSwyKT09PUxhPyhjPUxhLFNhKz0yKTooYz1FLDA9PT1ZYSYmZChNYSkpLGMhPT1FJiYoVGE9YixjPU5hKCkpLGI9YyxiPT09RSYmKGI9U2EsYS5zdWJzdHIoU2EsMik9PT1PYT8oYz1PYSxTYSs9Mik6KGM9RSwwPT09WWEmJmQoUGEpKSxjIT09RT8oZT1TYSxmPVNhLGc9eSgpLGchPT1FPyhoPXkoKSxoIT09RT8oaT15KCksaSE9PUU/KGo9eSgpLGohPT1FPyhnPVtnLGgsaSxqXSxmPWcpOihTYT1mLGY9SSkpOihTYT1mLGY9SSkpOihTYT1mLGY9SSkpOihTYT1mLGY9SSksZiE9PUUmJihmPWEuc3Vic3RyaW5nKGUsU2EpKSxlPWYsZSE9PUU/KFRhPWIsYz1RYShlKSxiPWMpOihTYT1iLGI9SSkpOihTYT1iLGI9SSkpKSkpLGJ9ZnVuY3Rpb24gQigpe3ZhciBhLGIsYztpZihhPVNhLGI9W10sYz1BKCksYyE9PUUpZm9yKDtjIT09RTspYi5wdXNoKGMpLGM9QSgpO2Vsc2UgYj1JO3JldHVybiBiIT09RSYmKFRhPWEsYj1SYShiKSksYT1ifXZhciBDLEQ9YXJndW1lbnRzLmxlbmd0aD4xP2FyZ3VtZW50c1sxXTp7fSxFPXt9LEY9e3N0YXJ0OmZ9LEc9ZixIPWZ1bmN0aW9uKGEpe3JldHVybnt0eXBlOlwibWVzc2FnZUZvcm1hdFBhdHRlcm5cIixlbGVtZW50czphfX0sST1FLEo9ZnVuY3Rpb24oYSl7dmFyIGIsYyxkLGUsZixnPVwiXCI7Zm9yKGI9MCxkPWEubGVuZ3RoO2Q+YjtiKz0xKWZvcihlPWFbYl0sYz0wLGY9ZS5sZW5ndGg7Zj5jO2MrPTEpZys9ZVtjXTtyZXR1cm4gZ30sSz1mdW5jdGlvbihhKXtyZXR1cm57dHlwZTpcIm1lc3NhZ2VUZXh0RWxlbWVudFwiLHZhbHVlOmF9fSxMPS9eW14gXFx0XFxuXFxyLC4rPXt9I10vLE09e3R5cGU6XCJjbGFzc1wiLHZhbHVlOlwiW14gXFxcXHRcXFxcblxcXFxyLC4rPXt9I11cIixkZXNjcmlwdGlvbjpcIlteIFxcXFx0XFxcXG5cXFxcciwuKz17fSNdXCJ9LE49XCJ7XCIsTz17dHlwZTpcImxpdGVyYWxcIix2YWx1ZTpcIntcIixkZXNjcmlwdGlvbjonXCJ7XCInfSxQPW51bGwsUT1cIixcIixSPXt0eXBlOlwibGl0ZXJhbFwiLHZhbHVlOlwiLFwiLGRlc2NyaXB0aW9uOidcIixcIid9LFM9XCJ9XCIsVD17dHlwZTpcImxpdGVyYWxcIix2YWx1ZTpcIn1cIixkZXNjcmlwdGlvbjonXCJ9XCInfSxVPWZ1bmN0aW9uKGEsYil7cmV0dXJue3R5cGU6XCJhcmd1bWVudEVsZW1lbnRcIixpZDphLGZvcm1hdDpiJiZiWzJdfX0sVj1cIm51bWJlclwiLFc9e3R5cGU6XCJsaXRlcmFsXCIsdmFsdWU6XCJudW1iZXJcIixkZXNjcmlwdGlvbjonXCJudW1iZXJcIid9LFg9XCJkYXRlXCIsWT17dHlwZTpcImxpdGVyYWxcIix2YWx1ZTpcImRhdGVcIixkZXNjcmlwdGlvbjonXCJkYXRlXCInfSxaPVwidGltZVwiLCQ9e3R5cGU6XCJsaXRlcmFsXCIsdmFsdWU6XCJ0aW1lXCIsZGVzY3JpcHRpb246J1widGltZVwiJ30sXz1mdW5jdGlvbihhLGIpe3JldHVybnt0eXBlOmErXCJGb3JtYXRcIixzdHlsZTpiJiZiWzJdfX0sYWE9XCJwbHVyYWxcIixiYT17dHlwZTpcImxpdGVyYWxcIix2YWx1ZTpcInBsdXJhbFwiLGRlc2NyaXB0aW9uOidcInBsdXJhbFwiJ30sY2E9ZnVuY3Rpb24oYSl7cmV0dXJue3R5cGU6YS50eXBlLG9yZGluYWw6ITEsb2Zmc2V0OmEub2Zmc2V0fHwwLG9wdGlvbnM6YS5vcHRpb25zfX0sZGE9XCJzZWxlY3RvcmRpbmFsXCIsZWE9e3R5cGU6XCJsaXRlcmFsXCIsdmFsdWU6XCJzZWxlY3RvcmRpbmFsXCIsZGVzY3JpcHRpb246J1wic2VsZWN0b3JkaW5hbFwiJ30sZmE9ZnVuY3Rpb24oYSl7cmV0dXJue3R5cGU6YS50eXBlLG9yZGluYWw6ITAsb2Zmc2V0OmEub2Zmc2V0fHwwLG9wdGlvbnM6YS5vcHRpb25zfX0sZ2E9XCJzZWxlY3RcIixoYT17dHlwZTpcImxpdGVyYWxcIix2YWx1ZTpcInNlbGVjdFwiLGRlc2NyaXB0aW9uOidcInNlbGVjdFwiJ30saWE9ZnVuY3Rpb24oYSl7cmV0dXJue3R5cGU6XCJzZWxlY3RGb3JtYXRcIixvcHRpb25zOmF9fSxqYT1cIj1cIixrYT17dHlwZTpcImxpdGVyYWxcIix2YWx1ZTpcIj1cIixkZXNjcmlwdGlvbjonXCI9XCInfSxsYT1mdW5jdGlvbihhLGIpe3JldHVybnt0eXBlOlwib3B0aW9uYWxGb3JtYXRQYXR0ZXJuXCIsc2VsZWN0b3I6YSx2YWx1ZTpifX0sbWE9XCJvZmZzZXQ6XCIsbmE9e3R5cGU6XCJsaXRlcmFsXCIsdmFsdWU6XCJvZmZzZXQ6XCIsZGVzY3JpcHRpb246J1wib2Zmc2V0OlwiJ30sb2E9ZnVuY3Rpb24oYSl7cmV0dXJuIGF9LHBhPWZ1bmN0aW9uKGEsYil7cmV0dXJue3R5cGU6XCJwbHVyYWxGb3JtYXRcIixvZmZzZXQ6YSxvcHRpb25zOmJ9fSxxYT17dHlwZTpcIm90aGVyXCIsZGVzY3JpcHRpb246XCJ3aGl0ZXNwYWNlXCJ9LHJhPS9eWyBcXHRcXG5cXHJdLyxzYT17dHlwZTpcImNsYXNzXCIsdmFsdWU6XCJbIFxcXFx0XFxcXG5cXFxccl1cIixkZXNjcmlwdGlvbjpcIlsgXFxcXHRcXFxcblxcXFxyXVwifSx0YT17dHlwZTpcIm90aGVyXCIsZGVzY3JpcHRpb246XCJvcHRpb25hbFdoaXRlc3BhY2VcIn0sdWE9L15bMC05XS8sdmE9e3R5cGU6XCJjbGFzc1wiLHZhbHVlOlwiWzAtOV1cIixkZXNjcmlwdGlvbjpcIlswLTldXCJ9LHdhPS9eWzAtOWEtZl0vaSx4YT17dHlwZTpcImNsYXNzXCIsdmFsdWU6XCJbMC05YS1mXWlcIixkZXNjcmlwdGlvbjpcIlswLTlhLWZdaVwifSx5YT1cIjBcIix6YT17dHlwZTpcImxpdGVyYWxcIix2YWx1ZTpcIjBcIixkZXNjcmlwdGlvbjonXCIwXCInfSxBYT0vXlsxLTldLyxCYT17dHlwZTpcImNsYXNzXCIsdmFsdWU6XCJbMS05XVwiLGRlc2NyaXB0aW9uOlwiWzEtOV1cIn0sQ2E9ZnVuY3Rpb24oYSl7cmV0dXJuIHBhcnNlSW50KGEsMTApfSxEYT0vXltee31cXFxcXFwwLVxceDFGfyBcXHRcXG5cXHJdLyxFYT17dHlwZTpcImNsYXNzXCIsdmFsdWU6XCJbXnt9XFxcXFxcXFxcXFxcMC1cXFxceDFGfyBcXFxcdFxcXFxuXFxcXHJdXCIsZGVzY3JpcHRpb246XCJbXnt9XFxcXFxcXFxcXFxcMC1cXFxceDFGfyBcXFxcdFxcXFxuXFxcXHJdXCJ9LEZhPVwiXFxcXCNcIixHYT17dHlwZTpcImxpdGVyYWxcIix2YWx1ZTpcIlxcXFwjXCIsZGVzY3JpcHRpb246J1wiXFxcXFxcXFwjXCInfSxIYT1mdW5jdGlvbigpe3JldHVyblwiXFxcXCNcIn0sSWE9XCJcXFxce1wiLEphPXt0eXBlOlwibGl0ZXJhbFwiLHZhbHVlOlwiXFxcXHtcIixkZXNjcmlwdGlvbjonXCJcXFxcXFxcXHtcIid9LEthPWZ1bmN0aW9uKCl7cmV0dXJuXCJ7XCJ9LExhPVwiXFxcXH1cIixNYT17dHlwZTpcImxpdGVyYWxcIix2YWx1ZTpcIlxcXFx9XCIsZGVzY3JpcHRpb246J1wiXFxcXFxcXFx9XCInfSxOYT1mdW5jdGlvbigpe3JldHVyblwifVwifSxPYT1cIlxcXFx1XCIsUGE9e3R5cGU6XCJsaXRlcmFsXCIsdmFsdWU6XCJcXFxcdVwiLGRlc2NyaXB0aW9uOidcIlxcXFxcXFxcdVwiJ30sUWE9ZnVuY3Rpb24oYSl7cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUocGFyc2VJbnQoYSwxNikpfSxSYT1mdW5jdGlvbihhKXtyZXR1cm4gYS5qb2luKFwiXCIpfSxTYT0wLFRhPTAsVWE9MCxWYT17bGluZToxLGNvbHVtbjoxLHNlZW5DUjohMX0sV2E9MCxYYT1bXSxZYT0wO2lmKFwic3RhcnRSdWxlXCJpbiBEKXtpZighKEQuc3RhcnRSdWxlIGluIEYpKXRocm93IG5ldyBFcnJvcihcIkNhbid0IHN0YXJ0IHBhcnNpbmcgZnJvbSBydWxlIFxcXCJcIitELnN0YXJ0UnVsZSsnXCIuJyk7Rz1GW0Quc3RhcnRSdWxlXX1pZihDPUcoKSxDIT09RSYmU2E9PT1hLmxlbmd0aClyZXR1cm4gQzt0aHJvdyBDIT09RSYmU2E8YS5sZW5ndGgmJmQoe3R5cGU6XCJlbmRcIixkZXNjcmlwdGlvbjpcImVuZCBvZiBpbnB1dFwifSksZShudWxsLFhhLFdhKX1yZXR1cm4gYShiLEVycm9yKSx7U3ludGF4RXJyb3I6YixwYXJzZTpjfX0oKSx2PWc7cihnLFwiZm9ybWF0c1wiLHtlbnVtZXJhYmxlOiEwLHZhbHVlOntudW1iZXI6e2N1cnJlbmN5OntzdHlsZTpcImN1cnJlbmN5XCJ9LHBlcmNlbnQ6e3N0eWxlOlwicGVyY2VudFwifX0sZGF0ZTp7XCJzaG9ydFwiOnttb250aDpcIm51bWVyaWNcIixkYXk6XCJudW1lcmljXCIseWVhcjpcIjItZGlnaXRcIn0sbWVkaXVtOnttb250aDpcInNob3J0XCIsZGF5OlwibnVtZXJpY1wiLHllYXI6XCJudW1lcmljXCJ9LFwibG9uZ1wiOnttb250aDpcImxvbmdcIixkYXk6XCJudW1lcmljXCIseWVhcjpcIm51bWVyaWNcIn0sZnVsbDp7d2Vla2RheTpcImxvbmdcIixtb250aDpcImxvbmdcIixkYXk6XCJudW1lcmljXCIseWVhcjpcIm51bWVyaWNcIn19LHRpbWU6e1wic2hvcnRcIjp7aG91cjpcIm51bWVyaWNcIixtaW51dGU6XCJudW1lcmljXCJ9LG1lZGl1bTp7aG91cjpcIm51bWVyaWNcIixtaW51dGU6XCJudW1lcmljXCIsc2Vjb25kOlwibnVtZXJpY1wifSxcImxvbmdcIjp7aG91cjpcIm51bWVyaWNcIixtaW51dGU6XCJudW1lcmljXCIsc2Vjb25kOlwibnVtZXJpY1wiLHRpbWVab25lTmFtZTpcInNob3J0XCJ9LGZ1bGw6e2hvdXI6XCJudW1lcmljXCIsbWludXRlOlwibnVtZXJpY1wiLHNlY29uZDpcIm51bWVyaWNcIix0aW1lWm9uZU5hbWU6XCJzaG9ydFwifX19fSkscihnLFwiX19sb2NhbGVEYXRhX19cIix7dmFsdWU6cyhudWxsKX0pLHIoZyxcIl9fYWRkTG9jYWxlRGF0YVwiLHt2YWx1ZTpmdW5jdGlvbihhKXtpZighYXx8IWEubG9jYWxlKXRocm93IG5ldyBFcnJvcihcIkxvY2FsZSBkYXRhIHByb3ZpZGVkIHRvIEludGxNZXNzYWdlRm9ybWF0IGlzIG1pc3NpbmcgYSBgbG9jYWxlYCBwcm9wZXJ0eVwiKTtnLl9fbG9jYWxlRGF0YV9fW2EubG9jYWxlLnRvTG93ZXJDYXNlKCldPWF9fSkscihnLFwiX19wYXJzZVwiLHt2YWx1ZTp1LnBhcnNlfSkscihnLFwiZGVmYXVsdExvY2FsZVwiLHtlbnVtZXJhYmxlOiEwLHdyaXRhYmxlOiEwLHZhbHVlOnZvaWQgMH0pLGcucHJvdG90eXBlLnJlc29sdmVkT3B0aW9ucz1mdW5jdGlvbigpe3JldHVybntsb2NhbGU6dGhpcy5fbG9jYWxlfX0sZy5wcm90b3R5cGUuX2NvbXBpbGVQYXR0ZXJuPWZ1bmN0aW9uKGEsYixjLGQpe3ZhciBlPW5ldyB0KGIsYyxkKTtyZXR1cm4gZS5jb21waWxlKGEpfSxnLnByb3RvdHlwZS5fZmluZFBsdXJhbFJ1bGVGdW5jdGlvbj1mdW5jdGlvbihhKXtmb3IodmFyIGI9Zy5fX2xvY2FsZURhdGFfXyxjPWJbYS50b0xvd2VyQ2FzZSgpXTtjOyl7aWYoYy5wbHVyYWxSdWxlRnVuY3Rpb24pcmV0dXJuIGMucGx1cmFsUnVsZUZ1bmN0aW9uO2M9Yy5wYXJlbnRMb2NhbGUmJmJbYy5wYXJlbnRMb2NhbGUudG9Mb3dlckNhc2UoKV19dGhyb3cgbmV3IEVycm9yKFwiTG9jYWxlIGRhdGEgYWRkZWQgdG8gSW50bE1lc3NhZ2VGb3JtYXQgaXMgbWlzc2luZyBhIGBwbHVyYWxSdWxlRnVuY3Rpb25gIGZvciA6XCIrYSl9LGcucHJvdG90eXBlLl9mb3JtYXQ9ZnVuY3Rpb24oYSxiKXt2YXIgYyxkLGUsZixnLGg9XCJcIjtmb3IoYz0wLGQ9YS5sZW5ndGg7ZD5jO2MrPTEpaWYoZT1hW2NdLFwic3RyaW5nXCIhPXR5cGVvZiBlKXtpZihmPWUuaWQsIWJ8fCFwLmNhbGwoYixmKSl0aHJvdyBuZXcgRXJyb3IoXCJBIHZhbHVlIG11c3QgYmUgcHJvdmlkZWQgZm9yOiBcIitmKTtnPWJbZl0saCs9ZS5vcHRpb25zP3RoaXMuX2Zvcm1hdChlLmdldE9wdGlvbihnKSxiKTplLmZvcm1hdChnKX1lbHNlIGgrPWU7cmV0dXJuIGh9LGcucHJvdG90eXBlLl9tZXJnZUZvcm1hdHM9ZnVuY3Rpb24oYixjKXt2YXIgZCxlLGY9e307Zm9yKGQgaW4gYilwLmNhbGwoYixkKSYmKGZbZF09ZT1zKGJbZF0pLGMmJnAuY2FsbChjLGQpJiZhKGUsY1tkXSkpO3JldHVybiBmfSxnLnByb3RvdHlwZS5fcmVzb2x2ZUxvY2FsZT1mdW5jdGlvbihhKXtcInN0cmluZ1wiPT10eXBlb2YgYSYmKGE9W2FdKSxhPShhfHxbXSkuY29uY2F0KGcuZGVmYXVsdExvY2FsZSk7dmFyIGIsYyxkLGUsZj1nLl9fbG9jYWxlRGF0YV9fO2ZvcihiPTAsYz1hLmxlbmd0aDtjPmI7Yis9MSlmb3IoZD1hW2JdLnRvTG93ZXJDYXNlKCkuc3BsaXQoXCItXCIpO2QubGVuZ3RoOyl7aWYoZT1mW2Quam9pbihcIi1cIildKXJldHVybiBlLmxvY2FsZTtkLnBvcCgpfXZhciBoPWEucG9wKCk7dGhyb3cgbmV3IEVycm9yKFwiTm8gbG9jYWxlIGRhdGEgaGFzIGJlZW4gYWRkZWQgdG8gSW50bE1lc3NhZ2VGb3JtYXQgZm9yOiBcIithLmpvaW4oXCIsIFwiKStcIiwgb3IgdGhlIGRlZmF1bHQgbG9jYWxlOiBcIitoKX07dmFyIHc9e2xvY2FsZTpcImVuXCIscGx1cmFsUnVsZUZ1bmN0aW9uOmZ1bmN0aW9uKGEsYil7dmFyIGM9U3RyaW5nKGEpLnNwbGl0KFwiLlwiKSxkPSFjWzFdLGU9TnVtYmVyKGNbMF0pPT1hLGY9ZSYmY1swXS5zbGljZSgtMSksZz1lJiZjWzBdLnNsaWNlKC0yKTtyZXR1cm4gYj8xPT1mJiYxMSE9Zz9cIm9uZVwiOjI9PWYmJjEyIT1nP1widHdvXCI6Mz09ZiYmMTMhPWc/XCJmZXdcIjpcIm90aGVyXCI6MT09YSYmZD9cIm9uZVwiOlwib3RoZXJcIn19O3YuX19hZGRMb2NhbGVEYXRhKHcpLHYuZGVmYXVsdExvY2FsZT1cImVuXCI7dmFyIHg9dix5PU1hdGgucm91bmQsej1mdW5jdGlvbihhLGIpe2E9K2EsYj0rYjt2YXIgYz15KGItYSksZD15KGMvMWUzKSxlPXkoZC82MCksZj15KGUvNjApLGc9eShmLzI0KSxpPXkoZy83KSxqPWgoZyksaz15KDEyKmopLGw9eShqKTtyZXR1cm57bWlsbGlzZWNvbmQ6YyxzZWNvbmQ6ZCxtaW51dGU6ZSxob3VyOmYsZGF5Omcsd2VlazppLG1vbnRoOmsseWVhcjpsfX0sQT1PYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LEI9T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxDPWZ1bmN0aW9uKCl7dHJ5e3JldHVybiEhT2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LFwiYVwiLHt9KX1jYXRjaChhKXtyZXR1cm4hMX19KCksRD0oIUMmJiFPYmplY3QucHJvdG90eXBlLl9fZGVmaW5lR2V0dGVyX18sQz9PYmplY3QuZGVmaW5lUHJvcGVydHk6ZnVuY3Rpb24oYSxiLGMpe1wiZ2V0XCJpbiBjJiZhLl9fZGVmaW5lR2V0dGVyX18/YS5fX2RlZmluZUdldHRlcl9fKGIsYy5nZXQpOighQS5jYWxsKGEsYil8fFwidmFsdWVcImluIGMpJiYoYVtiXT1jLnZhbHVlKX0pLEU9T2JqZWN0LmNyZWF0ZXx8ZnVuY3Rpb24oYSxiKXtmdW5jdGlvbiBjKCl7fXZhciBkLGU7Yy5wcm90b3R5cGU9YSxkPW5ldyBjO2ZvcihlIGluIGIpQS5jYWxsKGIsZSkmJkQoZCxlLGJbZV0pO3JldHVybiBkfSxGPUFycmF5LnByb3RvdHlwZS5pbmRleE9mfHxmdW5jdGlvbihhLGIpe3ZhciBjPXRoaXM7aWYoIWMubGVuZ3RoKXJldHVybi0xO2Zvcih2YXIgZD1ifHwwLGU9Yy5sZW5ndGg7ZT5kO2QrKylpZihjW2RdPT09YSlyZXR1cm4gZDtyZXR1cm4tMX0sRz1BcnJheS5pc0FycmF5fHxmdW5jdGlvbihhKXtyZXR1cm5cIltvYmplY3QgQXJyYXldXCI9PT1CLmNhbGwoYSl9LEg9RGF0ZS5ub3d8fGZ1bmN0aW9uKCl7cmV0dXJuKG5ldyBEYXRlKS5nZXRUaW1lKCl9LEk9aSxKPVtcInNlY29uZFwiLFwibWludXRlXCIsXCJob3VyXCIsXCJkYXlcIixcIm1vbnRoXCIsXCJ5ZWFyXCJdLEs9W1wiYmVzdCBmaXRcIixcIm51bWVyaWNcIl07RChpLFwiX19sb2NhbGVEYXRhX19cIix7dmFsdWU6RShudWxsKX0pLEQoaSxcIl9fYWRkTG9jYWxlRGF0YVwiLHt2YWx1ZTpmdW5jdGlvbihhKXtpZighYXx8IWEubG9jYWxlKXRocm93IG5ldyBFcnJvcihcIkxvY2FsZSBkYXRhIHByb3ZpZGVkIHRvIEludGxSZWxhdGl2ZUZvcm1hdCBpcyBtaXNzaW5nIGEgYGxvY2FsZWAgcHJvcGVydHkgdmFsdWVcIik7aS5fX2xvY2FsZURhdGFfX1thLmxvY2FsZS50b0xvd2VyQ2FzZSgpXT1hLHguX19hZGRMb2NhbGVEYXRhKGEpfX0pLEQoaSxcImRlZmF1bHRMb2NhbGVcIix7ZW51bWVyYWJsZTohMCx3cml0YWJsZTohMCx2YWx1ZTp2b2lkIDB9KSxEKGksXCJ0aHJlc2hvbGRzXCIse2VudW1lcmFibGU6ITAsdmFsdWU6e3NlY29uZDo0NSxtaW51dGU6NDUsaG91cjoyMixkYXk6MjYsbW9udGg6MTF9fSksaS5wcm90b3R5cGUucmVzb2x2ZWRPcHRpb25zPWZ1bmN0aW9uKCl7cmV0dXJue2xvY2FsZTp0aGlzLl9sb2NhbGUsc3R5bGU6dGhpcy5fb3B0aW9ucy5zdHlsZSx1bml0czp0aGlzLl9vcHRpb25zLnVuaXRzfX0saS5wcm90b3R5cGUuX2NvbXBpbGVNZXNzYWdlPWZ1bmN0aW9uKGEpe3ZhciBiLGM9dGhpcy5fbG9jYWxlcyxkPSh0aGlzLl9sb2NhbGUsdGhpcy5fZmllbGRzW2FdKSxlPWQucmVsYXRpdmVUaW1lLGY9XCJcIixnPVwiXCI7Zm9yKGIgaW4gZS5mdXR1cmUpZS5mdXR1cmUuaGFzT3duUHJvcGVydHkoYikmJihmKz1cIiBcIitiK1wiIHtcIitlLmZ1dHVyZVtiXS5yZXBsYWNlKFwiezB9XCIsXCIjXCIpK1wifVwiKTtmb3IoYiBpbiBlLnBhc3QpZS5wYXN0Lmhhc093blByb3BlcnR5KGIpJiYoZys9XCIgXCIrYitcIiB7XCIrZS5wYXN0W2JdLnJlcGxhY2UoXCJ7MH1cIixcIiNcIikrXCJ9XCIpO3ZhciBoPVwie3doZW4sIHNlbGVjdCwgZnV0dXJlIHt7MCwgcGx1cmFsLCBcIitmK1wifX1wYXN0IHt7MCwgcGx1cmFsLCBcIitnK1wifX19XCI7cmV0dXJuIG5ldyB4KGgsYyl9LGkucHJvdG90eXBlLl9nZXRNZXNzYWdlPWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMuX21lc3NhZ2VzO3JldHVybiBiW2FdfHwoYlthXT10aGlzLl9jb21waWxlTWVzc2FnZShhKSksYlthXX0saS5wcm90b3R5cGUuX2dldFJlbGF0aXZlVW5pdHM9ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLl9maWVsZHNbYl07cmV0dXJuIGMucmVsYXRpdmU/Yy5yZWxhdGl2ZVthXTp2b2lkIDB9LGkucHJvdG90eXBlLl9maW5kRmllbGRzPWZ1bmN0aW9uKGEpe2Zvcih2YXIgYj1pLl9fbG9jYWxlRGF0YV9fLGM9YlthLnRvTG93ZXJDYXNlKCldO2M7KXtpZihjLmZpZWxkcylyZXR1cm4gYy5maWVsZHM7Yz1jLnBhcmVudExvY2FsZSYmYltjLnBhcmVudExvY2FsZS50b0xvd2VyQ2FzZSgpXX10aHJvdyBuZXcgRXJyb3IoXCJMb2NhbGUgZGF0YSBhZGRlZCB0byBJbnRsUmVsYXRpdmVGb3JtYXQgaXMgbWlzc2luZyBgZmllbGRzYCBmb3IgOlwiK2EpfSxpLnByb3RvdHlwZS5fZm9ybWF0PWZ1bmN0aW9uKGEsYil7dmFyIGM9YiYmdm9pZCAwIT09Yi5ub3c/Yi5ub3c6SCgpO2lmKHZvaWQgMD09PWEmJihhPWMpLCFpc0Zpbml0ZShjKSl0aHJvdyBuZXcgUmFuZ2VFcnJvcihcIlRoZSBgbm93YCBvcHRpb24gcHJvdmlkZWQgdG8gSW50bFJlbGF0aXZlRm9ybWF0I2Zvcm1hdCgpIGlzIG5vdCBpbiB2YWxpZCByYW5nZS5cIik7aWYoIWlzRmluaXRlKGEpKXRocm93IG5ldyBSYW5nZUVycm9yKFwiVGhlIGRhdGUgdmFsdWUgcHJvdmlkZWQgdG8gSW50bFJlbGF0aXZlRm9ybWF0I2Zvcm1hdCgpIGlzIG5vdCBpbiB2YWxpZCByYW5nZS5cIik7dmFyIGQ9eihjLGEpLGU9dGhpcy5fb3B0aW9ucy51bml0c3x8dGhpcy5fc2VsZWN0VW5pdHMoZCksZj1kW2VdO2lmKFwibnVtZXJpY1wiIT09dGhpcy5fb3B0aW9ucy5zdHlsZSl7dmFyIGc9dGhpcy5fZ2V0UmVsYXRpdmVVbml0cyhmLGUpO2lmKGcpcmV0dXJuIGd9cmV0dXJuIHRoaXMuX2dldE1lc3NhZ2UoZSkuZm9ybWF0KHswOk1hdGguYWJzKGYpLHdoZW46MD5mP1wicGFzdFwiOlwiZnV0dXJlXCJ9KX0saS5wcm90b3R5cGUuX2lzVmFsaWRVbml0cz1mdW5jdGlvbihhKXtpZighYXx8Ri5jYWxsKEosYSk+PTApcmV0dXJuITA7aWYoXCJzdHJpbmdcIj09dHlwZW9mIGEpe3ZhciBiPS9zJC8udGVzdChhKSYmYS5zdWJzdHIoMCxhLmxlbmd0aC0xKTtpZihiJiZGLmNhbGwoSixiKT49MCl0aHJvdyBuZXcgRXJyb3IoJ1wiJythKydcIiBpcyBub3QgYSB2YWxpZCBJbnRsUmVsYXRpdmVGb3JtYXQgYHVuaXRzYCB2YWx1ZSwgZGlkIHlvdSBtZWFuOiAnK2IpfXRocm93IG5ldyBFcnJvcignXCInK2ErJ1wiIGlzIG5vdCBhIHZhbGlkIEludGxSZWxhdGl2ZUZvcm1hdCBgdW5pdHNgIHZhbHVlLCBpdCBtdXN0IGJlIG9uZSBvZjogXCInK0ouam9pbignXCIsIFwiJykrJ1wiJyl9LGkucHJvdG90eXBlLl9yZXNvbHZlTG9jYWxlPWZ1bmN0aW9uKGEpe1wic3RyaW5nXCI9PXR5cGVvZiBhJiYoYT1bYV0pLGE9KGF8fFtdKS5jb25jYXQoaS5kZWZhdWx0TG9jYWxlKTt2YXIgYixjLGQsZSxmPWkuX19sb2NhbGVEYXRhX187Zm9yKGI9MCxjPWEubGVuZ3RoO2M+YjtiKz0xKWZvcihkPWFbYl0udG9Mb3dlckNhc2UoKS5zcGxpdChcIi1cIik7ZC5sZW5ndGg7KXtpZihlPWZbZC5qb2luKFwiLVwiKV0pcmV0dXJuIGUubG9jYWxlO2QucG9wKCl9dmFyIGc9YS5wb3AoKTt0aHJvdyBuZXcgRXJyb3IoXCJObyBsb2NhbGUgZGF0YSBoYXMgYmVlbiBhZGRlZCB0byBJbnRsUmVsYXRpdmVGb3JtYXQgZm9yOiBcIithLmpvaW4oXCIsIFwiKStcIiwgb3IgdGhlIGRlZmF1bHQgbG9jYWxlOiBcIitnKX0saS5wcm90b3R5cGUuX3Jlc29sdmVTdHlsZT1mdW5jdGlvbihhKXtpZighYSlyZXR1cm4gS1swXTtpZihGLmNhbGwoSyxhKT49MClyZXR1cm4gYTt0aHJvdyBuZXcgRXJyb3IoJ1wiJythKydcIiBpcyBub3QgYSB2YWxpZCBJbnRsUmVsYXRpdmVGb3JtYXQgYHN0eWxlYCB2YWx1ZSwgaXQgbXVzdCBiZSBvbmUgb2Y6IFwiJytLLmpvaW4oJ1wiLCBcIicpKydcIicpfSxpLnByb3RvdHlwZS5fc2VsZWN0VW5pdHM9ZnVuY3Rpb24oYSl7dmFyIGIsYyxkO2ZvcihiPTAsYz1KLmxlbmd0aDtjPmImJihkPUpbYl0sIShNYXRoLmFicyhhW2RdKTxpLnRocmVzaG9sZHNbZF0pKTtiKz0xKTtyZXR1cm4gZH07dmFyIEw9e2xvY2FsZTpcImVuXCIscGx1cmFsUnVsZUZ1bmN0aW9uOmZ1bmN0aW9uKGEsYil7dmFyIGM9U3RyaW5nKGEpLnNwbGl0KFwiLlwiKSxkPSFjWzFdLGU9TnVtYmVyKGNbMF0pPT1hLGY9ZSYmY1swXS5zbGljZSgtMSksZz1lJiZjWzBdLnNsaWNlKC0yKTtyZXR1cm4gYj8xPT1mJiYxMSE9Zz9cIm9uZVwiOjI9PWYmJjEyIT1nP1widHdvXCI6Mz09ZiYmMTMhPWc/XCJmZXdcIjpcIm90aGVyXCI6MT09YSYmZD9cIm9uZVwiOlwib3RoZXJcIn0sZmllbGRzOnt5ZWFyOntkaXNwbGF5TmFtZTpcIlllYXJcIixyZWxhdGl2ZTp7MDpcInRoaXMgeWVhclwiLDE6XCJuZXh0IHllYXJcIixcIi0xXCI6XCJsYXN0IHllYXJcIn0scmVsYXRpdmVUaW1lOntmdXR1cmU6e29uZTpcImluIHswfSB5ZWFyXCIsb3RoZXI6XCJpbiB7MH0geWVhcnNcIn0scGFzdDp7b25lOlwiezB9IHllYXIgYWdvXCIsb3RoZXI6XCJ7MH0geWVhcnMgYWdvXCJ9fX0sbW9udGg6e2Rpc3BsYXlOYW1lOlwiTW9udGhcIixyZWxhdGl2ZTp7MDpcInRoaXMgbW9udGhcIiwxOlwibmV4dCBtb250aFwiLFwiLTFcIjpcImxhc3QgbW9udGhcIn0scmVsYXRpdmVUaW1lOntmdXR1cmU6e29uZTpcImluIHswfSBtb250aFwiLG90aGVyOlwiaW4gezB9IG1vbnRoc1wifSxwYXN0OntvbmU6XCJ7MH0gbW9udGggYWdvXCIsb3RoZXI6XCJ7MH0gbW9udGhzIGFnb1wifX19LGRheTp7ZGlzcGxheU5hbWU6XCJEYXlcIixyZWxhdGl2ZTp7MDpcInRvZGF5XCIsMTpcInRvbW9ycm93XCIsXCItMVwiOlwieWVzdGVyZGF5XCJ9LHJlbGF0aXZlVGltZTp7ZnV0dXJlOntvbmU6XCJpbiB7MH0gZGF5XCIsb3RoZXI6XCJpbiB7MH0gZGF5c1wifSxwYXN0OntvbmU6XCJ7MH0gZGF5IGFnb1wiLG90aGVyOlwiezB9IGRheXMgYWdvXCJ9fX0saG91cjp7ZGlzcGxheU5hbWU6XCJIb3VyXCIscmVsYXRpdmVUaW1lOntmdXR1cmU6e29uZTpcImluIHswfSBob3VyXCIsb3RoZXI6XCJpbiB7MH0gaG91cnNcIn0scGFzdDp7b25lOlwiezB9IGhvdXIgYWdvXCIsb3RoZXI6XCJ7MH0gaG91cnMgYWdvXCJ9fX0sbWludXRlOntkaXNwbGF5TmFtZTpcIk1pbnV0ZVwiLHJlbGF0aXZlVGltZTp7ZnV0dXJlOntvbmU6XCJpbiB7MH0gbWludXRlXCIsb3RoZXI6XCJpbiB7MH0gbWludXRlc1wifSxwYXN0OntvbmU6XCJ7MH0gbWludXRlIGFnb1wiLG90aGVyOlwiezB9IG1pbnV0ZXMgYWdvXCJ9fX0sc2Vjb25kOntkaXNwbGF5TmFtZTpcIlNlY29uZFwiLHJlbGF0aXZlOnswOlwibm93XCJ9LHJlbGF0aXZlVGltZTp7ZnV0dXJlOntvbmU6XCJpbiB7MH0gc2Vjb25kXCIsb3RoZXI6XCJpbiB7MH0gc2Vjb25kc1wifSxwYXN0OntvbmU6XCJ7MH0gc2Vjb25kIGFnb1wiLG90aGVyOlwiezB9IHNlY29uZHMgYWdvXCJ9fX19fTtJLl9fYWRkTG9jYWxlRGF0YShMKSxJLmRlZmF1bHRMb2NhbGU9XCJlblwiO3ZhciBNPUksTj1PYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LE89ZnVuY3Rpb24oKXt0cnl7cmV0dXJuISFPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sXCJhXCIse30pfWNhdGNoKGEpe3JldHVybiExfX0oKSxQPSghTyYmIU9iamVjdC5wcm90b3R5cGUuX19kZWZpbmVHZXR0ZXJfXyxPP09iamVjdC5kZWZpbmVQcm9wZXJ0eTpmdW5jdGlvbihhLGIsYyl7XCJnZXRcImluIGMmJmEuX19kZWZpbmVHZXR0ZXJfXz9hLl9fZGVmaW5lR2V0dGVyX18oYixjLmdldCk6KCFOLmNhbGwoYSxiKXx8XCJ2YWx1ZVwiaW4gYykmJihhW2JdPWMudmFsdWUpfSksUT1PYmplY3QuY3JlYXRlfHxmdW5jdGlvbihhLGIpe2Z1bmN0aW9uIGMoKXt9dmFyIGQsZTtjLnByb3RvdHlwZT1hLGQ9bmV3IGM7Zm9yKGUgaW4gYilOLmNhbGwoYixlKSYmUChkLGUsYltlXSk7cmV0dXJuIGR9LFI9aixTPVIoSW50bC5OdW1iZXJGb3JtYXQpLFQ9UihJbnRsLkRhdGVUaW1lRm9ybWF0KSxVPVIoeCksVj1SKE0pLFc9e2xvY2FsZTpcImVuXCIscGx1cmFsUnVsZUZ1bmN0aW9uOmZ1bmN0aW9uKGEsYil7dmFyIGM9U3RyaW5nKGEpLnNwbGl0KFwiLlwiKSxkPSFjWzFdLGU9TnVtYmVyKGNbMF0pPT1hLGY9ZSYmY1swXS5zbGljZSgtMSksZz1lJiZjWzBdLnNsaWNlKC0yKTtyZXR1cm4gYj8xPT1mJiYxMSE9Zz9cIm9uZVwiOjI9PWYmJjEyIT1nP1widHdvXCI6Mz09ZiYmMTMhPWc/XCJmZXdcIjpcIm90aGVyXCI6MT09YSYmZD9cIm9uZVwiOlwib3RoZXJcIn0sZmllbGRzOnt5ZWFyOntkaXNwbGF5TmFtZTpcIlllYXJcIixyZWxhdGl2ZTp7MDpcInRoaXMgeWVhclwiLDE6XCJuZXh0IHllYXJcIixcIi0xXCI6XCJsYXN0IHllYXJcIn0scmVsYXRpdmVUaW1lOntmdXR1cmU6e29uZTpcImluIHswfSB5ZWFyXCIsb3RoZXI6XCJpbiB7MH0geWVhcnNcIn0scGFzdDp7b25lOlwiezB9IHllYXIgYWdvXCIsb3RoZXI6XCJ7MH0geWVhcnMgYWdvXCJ9fX0sbW9udGg6e2Rpc3BsYXlOYW1lOlwiTW9udGhcIixyZWxhdGl2ZTp7MDpcInRoaXMgbW9udGhcIiwxOlwibmV4dCBtb250aFwiLFwiLTFcIjpcImxhc3QgbW9udGhcIn0scmVsYXRpdmVUaW1lOntmdXR1cmU6e29uZTpcImluIHswfSBtb250aFwiLG90aGVyOlwiaW4gezB9IG1vbnRoc1wifSxwYXN0OntvbmU6XCJ7MH0gbW9udGggYWdvXCIsb3RoZXI6XCJ7MH0gbW9udGhzIGFnb1wifX19LGRheTp7ZGlzcGxheU5hbWU6XCJEYXlcIixyZWxhdGl2ZTp7MDpcInRvZGF5XCIsMTpcInRvbW9ycm93XCIsXCItMVwiOlwieWVzdGVyZGF5XCJ9LHJlbGF0aXZlVGltZTp7ZnV0dXJlOntvbmU6XCJpbiB7MH0gZGF5XCIsb3RoZXI6XCJpbiB7MH0gZGF5c1wifSxwYXN0OntvbmU6XCJ7MH0gZGF5IGFnb1wiLG90aGVyOlwiezB9IGRheXMgYWdvXCJ9fX0saG91cjp7ZGlzcGxheU5hbWU6XCJIb3VyXCIscmVsYXRpdmVUaW1lOntmdXR1cmU6e29uZTpcImluIHswfSBob3VyXCIsb3RoZXI6XCJpbiB7MH0gaG91cnNcIn0scGFzdDp7b25lOlwiezB9IGhvdXIgYWdvXCIsb3RoZXI6XCJ7MH0gaG91cnMgYWdvXCJ9fX0sbWludXRlOntkaXNwbGF5TmFtZTpcIk1pbnV0ZVwiLHJlbGF0aXZlVGltZTp7ZnV0dXJlOntvbmU6XCJpbiB7MH0gbWludXRlXCIsb3RoZXI6XCJpbiB7MH0gbWludXRlc1wifSxwYXN0OntvbmU6XCJ7MH0gbWludXRlIGFnb1wiLG90aGVyOlwiezB9IG1pbnV0ZXMgYWdvXCJ9fX0sc2Vjb25kOntkaXNwbGF5TmFtZTpcIlNlY29uZFwiLHJlbGF0aXZlOnswOlwibm93XCJ9LHJlbGF0aXZlVGltZTp7ZnV0dXJlOntvbmU6XCJpbiB7MH0gc2Vjb25kXCIsb3RoZXI6XCJpbiB7MH0gc2Vjb25kc1wifSxwYXN0OntvbmU6XCJ7MH0gc2Vjb25kIGFnb1wiLG90aGVyOlwiezB9IHNlY29uZHMgYWdvXCJ9fX19fTtvKFcpO3ZhciBYPXtyZWdpc3RlcldpdGg6bixfX2FkZExvY2FsZURhdGE6b307dGhpcy5IYW5kbGViYXJzSW50bD1YfSkuY2FsbCh0aGlzKTtcclxuIiwiLyohXHJcblxyXG4gaGFuZGxlYmFycyB2My4wLjBcclxuXHJcbkNvcHlyaWdodCAoQykgMjAxMS0yMDE0IGJ5IFllaHVkYSBLYXR6XHJcblxyXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XHJcbm9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcclxuaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xyXG50byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXHJcbmNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xyXG5mdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxyXG5cclxuVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cclxuYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXHJcblxyXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXHJcbklNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxyXG5GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcclxuQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxyXG5MSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxyXG5PVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXHJcblRIRSBTT0ZUV0FSRS5cclxuXHJcbkBsaWNlbnNlXHJcbiovXHJcbi8qIGV4cG9ydGVkIEhhbmRsZWJhcnMgKi9cclxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJvb3QuSGFuZGxlYmFycyA9IGZhY3RvcnkoKTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24gKCkge1xyXG4vLyBoYW5kbGViYXJzL3V0aWxzLmpzXHJcbnZhciBfX21vZHVsZTNfXyA9IChmdW5jdGlvbigpIHtcclxuICBcInVzZSBzdHJpY3RcIjtcclxuICB2YXIgX19leHBvcnRzX18gPSB7fTtcclxuICAvKmpzaGludCAtVzAwNCAqL1xyXG4gIHZhciBlc2NhcGUgPSB7XHJcbiAgICBcIiZcIjogXCImYW1wO1wiLFxyXG4gICAgXCI8XCI6IFwiJmx0O1wiLFxyXG4gICAgXCI+XCI6IFwiJmd0O1wiLFxyXG4gICAgJ1wiJzogXCImcXVvdDtcIixcclxuICAgIFwiJ1wiOiBcIiYjeDI3O1wiLFxyXG4gICAgXCJgXCI6IFwiJiN4NjA7XCJcclxuICB9O1xyXG5cclxuICB2YXIgYmFkQ2hhcnMgPSAvWyY8PlwiJ2BdL2c7XHJcbiAgdmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XHJcblxyXG4gIGZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XHJcbiAgICByZXR1cm4gZXNjYXBlW2Nocl07XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBleHRlbmQob2JqIC8qICwgLi4uc291cmNlICovKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XHJcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhcmd1bWVudHNbaV0sIGtleSkpIHtcclxuICAgICAgICAgIG9ialtrZXldID0gYXJndW1lbnRzW2ldW2tleV07XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG9iajtcclxuICB9XHJcblxyXG4gIF9fZXhwb3J0c19fLmV4dGVuZCA9IGV4dGVuZDt2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xyXG4gIF9fZXhwb3J0c19fLnRvU3RyaW5nID0gdG9TdHJpbmc7XHJcbiAgLy8gU291cmNlZCBmcm9tIGxvZGFzaFxyXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXN0aWVqcy9sb2Rhc2gvYmxvYi9tYXN0ZXIvTElDRU5TRS50eHRcclxuICB2YXIgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xyXG4gIH07XHJcbiAgLy8gZmFsbGJhY2sgZm9yIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpXHJcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICBpZiAoaXNGdW5jdGlvbigveC8pKSB7XHJcbiAgICBpc0Z1bmN0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcclxuICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcclxuICAgIH07XHJcbiAgfVxyXG4gIHZhciBpc0Z1bmN0aW9uO1xyXG4gIF9fZXhwb3J0c19fLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xyXG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpID8gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XScgOiBmYWxzZTtcclxuICB9O1xyXG4gIF9fZXhwb3J0c19fLmlzQXJyYXkgPSBpc0FycmF5O1xyXG4gIC8vIE9sZGVyIElFIHZlcnNpb25zIGRvIG5vdCBkaXJlY3RseSBzdXBwb3J0IGluZGV4T2Ygc28gd2UgbXVzdCBpbXBsZW1lbnQgb3VyIG93biwgc2FkbHkuXHJcbiAgZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgdmFsdWUpIHtcclxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhcnJheS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICBpZiAoYXJyYXlbaV0gPT09IHZhbHVlKSB7XHJcbiAgICAgICAgcmV0dXJuIGk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiAtMTtcclxuICB9XHJcblxyXG4gIF9fZXhwb3J0c19fLmluZGV4T2YgPSBpbmRleE9mO1xyXG4gIGZ1bmN0aW9uIGVzY2FwZUV4cHJlc3Npb24oc3RyaW5nKSB7XHJcbiAgICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXHJcbiAgICBpZiAoc3RyaW5nICYmIHN0cmluZy50b0hUTUwpIHtcclxuICAgICAgcmV0dXJuIHN0cmluZy50b0hUTUwoKTtcclxuICAgIH0gZWxzZSBpZiAoc3RyaW5nID09IG51bGwpIHtcclxuICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICB9IGVsc2UgaWYgKCFzdHJpbmcpIHtcclxuICAgICAgcmV0dXJuIHN0cmluZyArICcnO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZvcmNlIGEgc3RyaW5nIGNvbnZlcnNpb24gYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgdGhlIGFwcGVuZCByZWdhcmRsZXNzIGFuZFxyXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXHJcbiAgICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cclxuICAgIHN0cmluZyA9IFwiXCIgKyBzdHJpbmc7XHJcblxyXG4gICAgaWYoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkgeyByZXR1cm4gc3RyaW5nOyB9XHJcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xyXG4gIH1cclxuXHJcbiAgX19leHBvcnRzX18uZXNjYXBlRXhwcmVzc2lvbiA9IGVzY2FwZUV4cHJlc3Npb247ZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSkge1xyXG4gICAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgX19leHBvcnRzX18uaXNFbXB0eSA9IGlzRW1wdHk7ZnVuY3Rpb24gYmxvY2tQYXJhbXMocGFyYW1zLCBpZHMpIHtcclxuICAgIHBhcmFtcy5wYXRoID0gaWRzO1xyXG4gICAgcmV0dXJuIHBhcmFtcztcclxuICB9XHJcblxyXG4gIF9fZXhwb3J0c19fLmJsb2NrUGFyYW1zID0gYmxvY2tQYXJhbXM7ZnVuY3Rpb24gYXBwZW5kQ29udGV4dFBhdGgoY29udGV4dFBhdGgsIGlkKSB7XHJcbiAgICByZXR1cm4gKGNvbnRleHRQYXRoID8gY29udGV4dFBhdGggKyAnLicgOiAnJykgKyBpZDtcclxuICB9XHJcblxyXG4gIF9fZXhwb3J0c19fLmFwcGVuZENvbnRleHRQYXRoID0gYXBwZW5kQ29udGV4dFBhdGg7XHJcbiAgcmV0dXJuIF9fZXhwb3J0c19fO1xyXG59KSgpO1xyXG5cclxuLy8gaGFuZGxlYmFycy9leGNlcHRpb24uanNcclxudmFyIF9fbW9kdWxlNF9fID0gKGZ1bmN0aW9uKCkge1xyXG4gIFwidXNlIHN0cmljdFwiO1xyXG4gIHZhciBfX2V4cG9ydHNfXztcclxuXHJcbiAgdmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xyXG5cclxuICBmdW5jdGlvbiBFeGNlcHRpb24obWVzc2FnZSwgbm9kZSkge1xyXG4gICAgdmFyIGxvYyA9IG5vZGUgJiYgbm9kZS5sb2MsXHJcbiAgICAgICAgbGluZSxcclxuICAgICAgICBjb2x1bW47XHJcbiAgICBpZiAobG9jKSB7XHJcbiAgICAgIGxpbmUgPSBsb2Muc3RhcnQubGluZTtcclxuICAgICAgY29sdW1uID0gbG9jLnN0YXJ0LmNvbHVtbjtcclxuXHJcbiAgICAgIG1lc3NhZ2UgKz0gJyAtICcgKyBsaW5lICsgJzonICsgY29sdW1uO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB0bXAgPSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcclxuXHJcbiAgICAvLyBVbmZvcnR1bmF0ZWx5IGVycm9ycyBhcmUgbm90IGVudW1lcmFibGUgaW4gQ2hyb21lIChhdCBsZWFzdCksIHNvIGBmb3IgcHJvcCBpbiB0bXBgIGRvZXNuJ3Qgd29yay5cclxuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xyXG4gICAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobG9jKSB7XHJcbiAgICAgIHRoaXMubGluZU51bWJlciA9IGxpbmU7XHJcbiAgICAgIHRoaXMuY29sdW1uID0gY29sdW1uO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xyXG5cclxuICBfX2V4cG9ydHNfXyA9IEV4Y2VwdGlvbjtcclxuICByZXR1cm4gX19leHBvcnRzX187XHJcbn0pKCk7XHJcblxyXG4vLyBoYW5kbGViYXJzL2Jhc2UuanNcclxudmFyIF9fbW9kdWxlMl9fID0gKGZ1bmN0aW9uKF9fZGVwZW5kZW5jeTFfXywgX19kZXBlbmRlbmN5Ml9fKSB7XHJcbiAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgdmFyIF9fZXhwb3J0c19fID0ge307XHJcbiAgdmFyIFV0aWxzID0gX19kZXBlbmRlbmN5MV9fO1xyXG4gIHZhciBFeGNlcHRpb24gPSBfX2RlcGVuZGVuY3kyX187XHJcblxyXG4gIHZhciBWRVJTSU9OID0gXCIzLjAuMFwiO1xyXG4gIF9fZXhwb3J0c19fLlZFUlNJT04gPSBWRVJTSU9OO3ZhciBDT01QSUxFUl9SRVZJU0lPTiA9IDY7XHJcbiAgX19leHBvcnRzX18uQ09NUElMRVJfUkVWSVNJT04gPSBDT01QSUxFUl9SRVZJU0lPTjtcclxuICB2YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHtcclxuICAgIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XHJcbiAgICAyOiAnPT0gMS4wLjAtcmMuMycsXHJcbiAgICAzOiAnPT0gMS4wLjAtcmMuNCcsXHJcbiAgICA0OiAnPT0gMS54LngnLFxyXG4gICAgNTogJz09IDIuMC4wLWFscGhhLngnLFxyXG4gICAgNjogJz49IDIuMC4wLWJldGEuMSdcclxuICB9O1xyXG4gIF9fZXhwb3J0c19fLlJFVklTSU9OX0NIQU5HRVMgPSBSRVZJU0lPTl9DSEFOR0VTO1xyXG4gIHZhciBpc0FycmF5ID0gVXRpbHMuaXNBcnJheSxcclxuICAgICAgaXNGdW5jdGlvbiA9IFV0aWxzLmlzRnVuY3Rpb24sXHJcbiAgICAgIHRvU3RyaW5nID0gVXRpbHMudG9TdHJpbmcsXHJcbiAgICAgIG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcclxuXHJcbiAgZnVuY3Rpb24gSGFuZGxlYmFyc0Vudmlyb25tZW50KGhlbHBlcnMsIHBhcnRpYWxzKSB7XHJcbiAgICB0aGlzLmhlbHBlcnMgPSBoZWxwZXJzIHx8IHt9O1xyXG4gICAgdGhpcy5wYXJ0aWFscyA9IHBhcnRpYWxzIHx8IHt9O1xyXG5cclxuICAgIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnModGhpcyk7XHJcbiAgfVxyXG5cclxuICBfX2V4cG9ydHNfXy5IYW5kbGViYXJzRW52aXJvbm1lbnQgPSBIYW5kbGViYXJzRW52aXJvbm1lbnQ7SGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBIYW5kbGViYXJzRW52aXJvbm1lbnQsXHJcblxyXG4gICAgbG9nZ2VyOiBsb2dnZXIsXHJcbiAgICBsb2c6IGxvZyxcclxuXHJcbiAgICByZWdpc3RlckhlbHBlcjogZnVuY3Rpb24obmFtZSwgZm4pIHtcclxuICAgICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcclxuICAgICAgICBpZiAoZm4pIHsgdGhyb3cgbmV3IEV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cclxuICAgICAgICBVdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHVucmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgZGVsZXRlIHRoaXMuaGVscGVyc1tuYW1lXTtcclxuICAgIH0sXHJcblxyXG4gICAgcmVnaXN0ZXJQYXJ0aWFsOiBmdW5jdGlvbihuYW1lLCBwYXJ0aWFsKSB7XHJcbiAgICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XHJcbiAgICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsICBuYW1lKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAodHlwZW9mIHBhcnRpYWwgPT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdBdHRlbXB0aW5nIHRvIHJlZ2lzdGVyIGEgcGFydGlhbCBhcyB1bmRlZmluZWQnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHBhcnRpYWw7XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB1bnJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSkge1xyXG4gICAgICBkZWxldGUgdGhpcy5wYXJ0aWFsc1tuYW1lXTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBmdW5jdGlvbiByZWdpc3RlckRlZmF1bHRIZWxwZXJzKGluc3RhbmNlKSB7XHJcbiAgICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKC8qIFthcmdzLCBdb3B0aW9ucyAqLykge1xyXG4gICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgLy8gQSBtaXNzaW5nIGZpZWxkIGluIGEge3tmb299fSBjb25zdHVjdC5cclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIFNvbWVvbmUgaXMgYWN0dWFsbHkgdHJ5aW5nIHRvIGNhbGwgc29tZXRoaW5nLCBibG93IHVwLlxyXG4gICAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJNaXNzaW5nIGhlbHBlcjogJ1wiICsgYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGgtMV0ubmFtZSArIFwiJ1wiKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcclxuICAgICAgdmFyIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UsXHJcbiAgICAgICAgICBmbiA9IG9wdGlvbnMuZm47XHJcblxyXG4gICAgICBpZihjb250ZXh0ID09PSB0cnVlKSB7XHJcbiAgICAgICAgcmV0dXJuIGZuKHRoaXMpO1xyXG4gICAgICB9IGVsc2UgaWYoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XHJcbiAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XHJcbiAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShjb250ZXh0KSkge1xyXG4gICAgICAgIGlmKGNvbnRleHQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgaWYgKG9wdGlvbnMuaWRzKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuaWRzID0gW29wdGlvbnMubmFtZV07XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnMuZWFjaChjb250ZXh0LCBvcHRpb25zKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcclxuICAgICAgICAgIHZhciBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcclxuICAgICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMubmFtZSk7XHJcbiAgICAgICAgICBvcHRpb25zID0ge2RhdGE6IGRhdGF9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcclxuICAgICAgaWYgKCFvcHRpb25zKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignTXVzdCBwYXNzIGl0ZXJhdG9yIHRvICNlYWNoJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XHJcbiAgICAgIHZhciBpID0gMCwgcmV0ID0gXCJcIiwgZGF0YTtcclxuXHJcbiAgICAgIHZhciBjb250ZXh0UGF0aDtcclxuICAgICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xyXG4gICAgICAgIGNvbnRleHRQYXRoID0gVXRpbHMuYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLmlkc1swXSkgKyAnLic7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cclxuXHJcbiAgICAgIGlmIChvcHRpb25zLmRhdGEpIHtcclxuICAgICAgICBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gZXhlY0l0ZXJhdGlvbihrZXksIGksIGxhc3QpIHtcclxuICAgICAgICBpZiAoZGF0YSkge1xyXG4gICAgICAgICAgZGF0YS5rZXkgPSBrZXk7XHJcbiAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcclxuICAgICAgICAgIGRhdGEuZmlyc3QgPSBpID09PSAwO1xyXG4gICAgICAgICAgZGF0YS5sYXN0ICA9ICEhbGFzdDtcclxuXHJcbiAgICAgICAgICBpZiAoY29udGV4dFBhdGgpIHtcclxuICAgICAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IGNvbnRleHRQYXRoICsga2V5O1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtrZXldLCB7XHJcbiAgICAgICAgICBkYXRhOiBkYXRhLFxyXG4gICAgICAgICAgYmxvY2tQYXJhbXM6IFV0aWxzLmJsb2NrUGFyYW1zKFtjb250ZXh0W2tleV0sIGtleV0sIFtjb250ZXh0UGF0aCArIGtleSwgbnVsbF0pXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcclxuICAgICAgICAgIGZvcih2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpPGo7IGkrKykge1xyXG4gICAgICAgICAgICBleGVjSXRlcmF0aW9uKGksIGksIGkgPT09IGNvbnRleHQubGVuZ3RoLTEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB2YXIgcHJpb3JLZXk7XHJcblxyXG4gICAgICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xyXG4gICAgICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAgICAgICAgICAvLyBXZSdyZSBydW5uaW5nIHRoZSBpdGVyYXRpb25zIG9uZSBzdGVwIG91dCBvZiBzeW5jIHNvIHdlIGNhbiBkZXRlY3RcclxuICAgICAgICAgICAgICAvLyB0aGUgbGFzdCBpdGVyYXRpb24gd2l0aG91dCBoYXZlIHRvIHNjYW4gdGhlIG9iamVjdCB0d2ljZSBhbmQgY3JlYXRlXHJcbiAgICAgICAgICAgICAgLy8gYW4gaXRlcm1lZGlhdGUga2V5cyBhcnJheS4gXHJcbiAgICAgICAgICAgICAgaWYgKHByaW9yS2V5KSB7XHJcbiAgICAgICAgICAgICAgICBleGVjSXRlcmF0aW9uKHByaW9yS2V5LCBpLTEpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBwcmlvcktleSA9IGtleTtcclxuICAgICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmIChwcmlvcktleSkge1xyXG4gICAgICAgICAgICBleGVjSXRlcmF0aW9uKHByaW9yS2V5LCBpLTEsIHRydWUpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoaSA9PT0gMCl7XHJcbiAgICAgICAgcmV0ID0gaW52ZXJzZSh0aGlzKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHJldDtcclxuICAgIH0pO1xyXG5cclxuICAgIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdpZicsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XHJcbiAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbmRpdGlvbmFsKSkgeyBjb25kaXRpb25hbCA9IGNvbmRpdGlvbmFsLmNhbGwodGhpcyk7IH1cclxuXHJcbiAgICAgIC8vIERlZmF1bHQgYmVoYXZpb3IgaXMgdG8gcmVuZGVyIHRoZSBwb3NpdGl2ZSBwYXRoIGlmIHRoZSB2YWx1ZSBpcyB0cnV0aHkgYW5kIG5vdCBlbXB0eS5cclxuICAgICAgLy8gVGhlIGBpbmNsdWRlWmVyb2Agb3B0aW9uIG1heSBiZSBzZXQgdG8gdHJlYXQgdGhlIGNvbmR0aW9uYWwgYXMgcHVyZWx5IG5vdCBlbXB0eSBiYXNlZCBvbiB0aGVcclxuICAgICAgLy8gYmVoYXZpb3Igb2YgaXNFbXB0eS4gRWZmZWN0aXZlbHkgdGhpcyBkZXRlcm1pbmVzIGlmIDAgaXMgaGFuZGxlZCBieSB0aGUgcG9zaXRpdmUgcGF0aCBvciBuZWdhdGl2ZS5cclxuICAgICAgaWYgKCghb3B0aW9ucy5oYXNoLmluY2x1ZGVaZXJvICYmICFjb25kaXRpb25hbCkgfHwgVXRpbHMuaXNFbXB0eShjb25kaXRpb25hbCkpIHtcclxuICAgICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcigndW5sZXNzJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcclxuICAgICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwge2ZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm4sIGhhc2g6IG9wdGlvbnMuaGFzaH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XHJcbiAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cclxuXHJcbiAgICAgIHZhciBmbiA9IG9wdGlvbnMuZm47XHJcblxyXG4gICAgICBpZiAoIVV0aWxzLmlzRW1wdHkoY29udGV4dCkpIHtcclxuICAgICAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XHJcbiAgICAgICAgICB2YXIgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XHJcbiAgICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gVXRpbHMuYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLmlkc1swXSk7XHJcbiAgICAgICAgICBvcHRpb25zID0ge2RhdGE6ZGF0YX07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKG1lc3NhZ2UsIG9wdGlvbnMpIHtcclxuICAgICAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xyXG4gICAgICBpbnN0YW5jZS5sb2cobGV2ZWwsIG1lc3NhZ2UpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvb2t1cCcsIGZ1bmN0aW9uKG9iaiwgZmllbGQpIHtcclxuICAgICAgcmV0dXJuIG9iaiAmJiBvYmpbZmllbGRdO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB2YXIgbG9nZ2VyID0ge1xyXG4gICAgbWV0aG9kTWFwOiB7IDA6ICdkZWJ1ZycsIDE6ICdpbmZvJywgMjogJ3dhcm4nLCAzOiAnZXJyb3InIH0sXHJcblxyXG4gICAgLy8gU3RhdGUgZW51bVxyXG4gICAgREVCVUc6IDAsXHJcbiAgICBJTkZPOiAxLFxyXG4gICAgV0FSTjogMixcclxuICAgIEVSUk9SOiAzLFxyXG4gICAgbGV2ZWw6IDEsXHJcblxyXG4gICAgLy8gQ2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcclxuICAgIGxvZzogZnVuY3Rpb24obGV2ZWwsIG1lc3NhZ2UpIHtcclxuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBsb2dnZXIubGV2ZWwgPD0gbGV2ZWwpIHtcclxuICAgICAgICB2YXIgbWV0aG9kID0gbG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XHJcbiAgICAgICAgKGNvbnNvbGVbbWV0aG9kXSB8fCBjb25zb2xlLmxvZykuY2FsbChjb25zb2xlLCBtZXNzYWdlKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH07XHJcbiAgX19leHBvcnRzX18ubG9nZ2VyID0gbG9nZ2VyO1xyXG4gIHZhciBsb2cgPSBsb2dnZXIubG9nO1xyXG4gIF9fZXhwb3J0c19fLmxvZyA9IGxvZztcclxuICB2YXIgY3JlYXRlRnJhbWUgPSBmdW5jdGlvbihvYmplY3QpIHtcclxuICAgIHZhciBmcmFtZSA9IFV0aWxzLmV4dGVuZCh7fSwgb2JqZWN0KTtcclxuICAgIGZyYW1lLl9wYXJlbnQgPSBvYmplY3Q7XHJcbiAgICByZXR1cm4gZnJhbWU7XHJcbiAgfTtcclxuICBfX2V4cG9ydHNfXy5jcmVhdGVGcmFtZSA9IGNyZWF0ZUZyYW1lO1xyXG4gIHJldHVybiBfX2V4cG9ydHNfXztcclxufSkoX19tb2R1bGUzX18sIF9fbW9kdWxlNF9fKTtcclxuXHJcbi8vIGhhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanNcclxudmFyIF9fbW9kdWxlNV9fID0gKGZ1bmN0aW9uKCkge1xyXG4gIFwidXNlIHN0cmljdFwiO1xyXG4gIHZhciBfX2V4cG9ydHNfXztcclxuICAvLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxyXG4gIGZ1bmN0aW9uIFNhZmVTdHJpbmcoc3RyaW5nKSB7XHJcbiAgICB0aGlzLnN0cmluZyA9IHN0cmluZztcclxuICB9XHJcblxyXG4gIFNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gU2FmZVN0cmluZy5wcm90b3R5cGUudG9IVE1MID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gXCJcIiArIHRoaXMuc3RyaW5nO1xyXG4gIH07XHJcblxyXG4gIF9fZXhwb3J0c19fID0gU2FmZVN0cmluZztcclxuICByZXR1cm4gX19leHBvcnRzX187XHJcbn0pKCk7XHJcblxyXG4vLyBoYW5kbGViYXJzL3J1bnRpbWUuanNcclxudmFyIF9fbW9kdWxlNl9fID0gKGZ1bmN0aW9uKF9fZGVwZW5kZW5jeTFfXywgX19kZXBlbmRlbmN5Ml9fLCBfX2RlcGVuZGVuY3kzX18pIHtcclxuICBcInVzZSBzdHJpY3RcIjtcclxuICB2YXIgX19leHBvcnRzX18gPSB7fTtcclxuICB2YXIgVXRpbHMgPSBfX2RlcGVuZGVuY3kxX187XHJcbiAgdmFyIEV4Y2VwdGlvbiA9IF9fZGVwZW5kZW5jeTJfXztcclxuICB2YXIgQ09NUElMRVJfUkVWSVNJT04gPSBfX2RlcGVuZGVuY3kzX18uQ09NUElMRVJfUkVWSVNJT047XHJcbiAgdmFyIFJFVklTSU9OX0NIQU5HRVMgPSBfX2RlcGVuZGVuY3kzX18uUkVWSVNJT05fQ0hBTkdFUztcclxuICB2YXIgY3JlYXRlRnJhbWUgPSBfX2RlcGVuZGVuY3kzX18uY3JlYXRlRnJhbWU7XHJcblxyXG4gIGZ1bmN0aW9uIGNoZWNrUmV2aXNpb24oY29tcGlsZXJJbmZvKSB7XHJcbiAgICB2YXIgY29tcGlsZXJSZXZpc2lvbiA9IGNvbXBpbGVySW5mbyAmJiBjb21waWxlckluZm9bMF0gfHwgMSxcclxuICAgICAgICBjdXJyZW50UmV2aXNpb24gPSBDT01QSUxFUl9SRVZJU0lPTjtcclxuXHJcbiAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XHJcbiAgICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XHJcbiAgICAgICAgdmFyIHJ1bnRpbWVWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcclxuICAgICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XHJcbiAgICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xyXG4gICAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrcnVudGltZVZlcnNpb25zK1wiKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKFwiK2NvbXBpbGVyVmVyc2lvbnMrXCIpLlwiKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcclxuICAgICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcclxuICAgICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIF9fZXhwb3J0c19fLmNoZWNrUmV2aXNpb24gPSBjaGVja1JldmlzaW9uOy8vIFRPRE86IFJlbW92ZSB0aGlzIGxpbmUgYW5kIGJyZWFrIHVwIGNvbXBpbGVQYXJ0aWFsXHJcblxyXG4gIGZ1bmN0aW9uIHRlbXBsYXRlKHRlbXBsYXRlU3BlYywgZW52KSB7XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgaWYgKCFlbnYpIHtcclxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIk5vIGVudmlyb25tZW50IHBhc3NlZCB0byB0ZW1wbGF0ZVwiKTtcclxuICAgIH1cclxuICAgIGlmICghdGVtcGxhdGVTcGVjIHx8ICF0ZW1wbGF0ZVNwZWMubWFpbikge1xyXG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdVbmtub3duIHRlbXBsYXRlIG9iamVjdDogJyArIHR5cGVvZiB0ZW1wbGF0ZVNwZWMpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIE5vdGU6IFVzaW5nIGVudi5WTSByZWZlcmVuY2VzIHJhdGhlciB0aGFuIGxvY2FsIHZhciByZWZlcmVuY2VzIHRocm91Z2hvdXQgdGhpcyBzZWN0aW9uIHRvIGFsbG93XHJcbiAgICAvLyBmb3IgZXh0ZXJuYWwgdXNlcnMgdG8gb3ZlcnJpZGUgdGhlc2UgYXMgcHN1ZWRvLXN1cHBvcnRlZCBBUElzLlxyXG4gICAgZW52LlZNLmNoZWNrUmV2aXNpb24odGVtcGxhdGVTcGVjLmNvbXBpbGVyKTtcclxuXHJcbiAgICB2YXIgaW52b2tlUGFydGlhbFdyYXBwZXIgPSBmdW5jdGlvbihwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKSB7XHJcbiAgICAgIGlmIChvcHRpb25zLmhhc2gpIHtcclxuICAgICAgICBjb250ZXh0ID0gVXRpbHMuZXh0ZW5kKHt9LCBjb250ZXh0LCBvcHRpb25zLmhhc2gpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBwYXJ0aWFsID0gZW52LlZNLnJlc29sdmVQYXJ0aWFsLmNhbGwodGhpcywgcGFydGlhbCwgY29udGV4dCwgb3B0aW9ucyk7XHJcbiAgICAgIHZhciByZXN1bHQgPSBlbnYuVk0uaW52b2tlUGFydGlhbC5jYWxsKHRoaXMsIHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgaWYgKHJlc3VsdCA9PSBudWxsICYmIGVudi5jb21waWxlKSB7XHJcbiAgICAgICAgb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdID0gZW52LmNvbXBpbGUocGFydGlhbCwgdGVtcGxhdGVTcGVjLmNvbXBpbGVyT3B0aW9ucywgZW52KTtcclxuICAgICAgICByZXN1bHQgPSBvcHRpb25zLnBhcnRpYWxzW29wdGlvbnMubmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHJlc3VsdCAhPSBudWxsKSB7XHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaW5kZW50KSB7XHJcbiAgICAgICAgICB2YXIgbGluZXMgPSByZXN1bHQuc3BsaXQoJ1xcbicpO1xyXG4gICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaW5lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKCFsaW5lc1tpXSAmJiBpICsgMSA9PT0gbCkge1xyXG4gICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsaW5lc1tpXSA9IG9wdGlvbnMuaW5kZW50ICsgbGluZXNbaV07XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXN1bHQgPSBsaW5lcy5qb2luKCdcXG4nKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBvcHRpb25zLm5hbWUgKyBcIiBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlXCIpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEp1c3QgYWRkIHdhdGVyXHJcbiAgICB2YXIgY29udGFpbmVyID0ge1xyXG4gICAgICBzdHJpY3Q6IGZ1bmN0aW9uKG9iaiwgbmFtZSkge1xyXG4gICAgICAgIGlmICghKG5hbWUgaW4gb2JqKSkge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignXCInICsgbmFtZSArICdcIiBub3QgZGVmaW5lZCBpbiAnICsgb2JqKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG9ialtuYW1lXTtcclxuICAgICAgfSxcclxuICAgICAgbG9va3VwOiBmdW5jdGlvbihkZXB0aHMsIG5hbWUpIHtcclxuICAgICAgICB2YXIgbGVuID0gZGVwdGhzLmxlbmd0aDtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgICBpZiAoZGVwdGhzW2ldICYmIGRlcHRoc1tpXVtuYW1lXSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBkZXB0aHNbaV1bbmFtZV07XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBsYW1iZGE6IGZ1bmN0aW9uKGN1cnJlbnQsIGNvbnRleHQpIHtcclxuICAgICAgICByZXR1cm4gdHlwZW9mIGN1cnJlbnQgPT09ICdmdW5jdGlvbicgPyBjdXJyZW50LmNhbGwoY29udGV4dCkgOiBjdXJyZW50O1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgZXNjYXBlRXhwcmVzc2lvbjogVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcclxuICAgICAgaW52b2tlUGFydGlhbDogaW52b2tlUGFydGlhbFdyYXBwZXIsXHJcblxyXG4gICAgICBmbjogZnVuY3Rpb24oaSkge1xyXG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZVNwZWNbaV07XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICBwcm9ncmFtczogW10sXHJcbiAgICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGRhdGEsIGRlY2xhcmVkQmxvY2tQYXJhbXMsIGJsb2NrUGFyYW1zLCBkZXB0aHMpIHtcclxuICAgICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldLFxyXG4gICAgICAgICAgICBmbiA9IHRoaXMuZm4oaSk7XHJcbiAgICAgICAgaWYgKGRhdGEgfHwgZGVwdGhzIHx8IGJsb2NrUGFyYW1zIHx8IGRlY2xhcmVkQmxvY2tQYXJhbXMpIHtcclxuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gcHJvZ3JhbSh0aGlzLCBpLCBmbiwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocyk7XHJcbiAgICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcclxuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSA9IHByb2dyYW0odGhpcywgaSwgZm4pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICBkYXRhOiBmdW5jdGlvbihkYXRhLCBkZXB0aCkge1xyXG4gICAgICAgIHdoaWxlIChkYXRhICYmIGRlcHRoLS0pIHtcclxuICAgICAgICAgIGRhdGEgPSBkYXRhLl9wYXJlbnQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICB9LFxyXG4gICAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xyXG4gICAgICAgIHZhciByZXQgPSBwYXJhbSB8fCBjb21tb247XHJcblxyXG4gICAgICAgIGlmIChwYXJhbSAmJiBjb21tb24gJiYgKHBhcmFtICE9PSBjb21tb24pKSB7XHJcbiAgICAgICAgICByZXQgPSBVdGlscy5leHRlbmQoe30sIGNvbW1vbiwgcGFyYW0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHJldDtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIG5vb3A6IGVudi5WTS5ub29wLFxyXG4gICAgICBjb21waWxlckluZm86IHRlbXBsYXRlU3BlYy5jb21waWxlclxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgcmV0ID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xyXG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuICAgICAgdmFyIGRhdGEgPSBvcHRpb25zLmRhdGE7XHJcblxyXG4gICAgICByZXQuX3NldHVwKG9wdGlvbnMpO1xyXG4gICAgICBpZiAoIW9wdGlvbnMucGFydGlhbCAmJiB0ZW1wbGF0ZVNwZWMudXNlRGF0YSkge1xyXG4gICAgICAgIGRhdGEgPSBpbml0RGF0YShjb250ZXh0LCBkYXRhKTtcclxuICAgICAgfVxyXG4gICAgICB2YXIgZGVwdGhzLFxyXG4gICAgICAgICAgYmxvY2tQYXJhbXMgPSB0ZW1wbGF0ZVNwZWMudXNlQmxvY2tQYXJhbXMgPyBbXSA6IHVuZGVmaW5lZDtcclxuICAgICAgaWYgKHRlbXBsYXRlU3BlYy51c2VEZXB0aHMpIHtcclxuICAgICAgICBkZXB0aHMgPSBvcHRpb25zLmRlcHRocyA/IFtjb250ZXh0XS5jb25jYXQob3B0aW9ucy5kZXB0aHMpIDogW2NvbnRleHRdO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gdGVtcGxhdGVTcGVjLm1haW4uY2FsbChjb250YWluZXIsIGNvbnRleHQsIGNvbnRhaW5lci5oZWxwZXJzLCBjb250YWluZXIucGFydGlhbHMsIGRhdGEsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xyXG4gICAgfTtcclxuICAgIHJldC5pc1RvcCA9IHRydWU7XHJcblxyXG4gICAgcmV0Ll9zZXR1cCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcclxuICAgICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcclxuICAgICAgICBjb250YWluZXIuaGVscGVycyA9IGNvbnRhaW5lci5tZXJnZShvcHRpb25zLmhlbHBlcnMsIGVudi5oZWxwZXJzKTtcclxuXHJcbiAgICAgICAgaWYgKHRlbXBsYXRlU3BlYy51c2VQYXJ0aWFsKSB7XHJcbiAgICAgICAgICBjb250YWluZXIucGFydGlhbHMgPSBjb250YWluZXIubWVyZ2Uob3B0aW9ucy5wYXJ0aWFscywgZW52LnBhcnRpYWxzKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29udGFpbmVyLmhlbHBlcnMgPSBvcHRpb25zLmhlbHBlcnM7XHJcbiAgICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICByZXQuX2NoaWxkID0gZnVuY3Rpb24oaSwgZGF0YSwgYmxvY2tQYXJhbXMsIGRlcHRocykge1xyXG4gICAgICBpZiAodGVtcGxhdGVTcGVjLnVzZUJsb2NrUGFyYW1zICYmICFibG9ja1BhcmFtcykge1xyXG4gICAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ211c3QgcGFzcyBibG9jayBwYXJhbXMnKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAodGVtcGxhdGVTcGVjLnVzZURlcHRocyAmJiAhZGVwdGhzKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignbXVzdCBwYXNzIHBhcmVudCBkZXB0aHMnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHByb2dyYW0oY29udGFpbmVyLCBpLCB0ZW1wbGF0ZVNwZWNbaV0sIGRhdGEsIDAsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xyXG4gICAgfTtcclxuICAgIHJldHVybiByZXQ7XHJcbiAgfVxyXG5cclxuICBfX2V4cG9ydHNfXy50ZW1wbGF0ZSA9IHRlbXBsYXRlO2Z1bmN0aW9uIHByb2dyYW0oY29udGFpbmVyLCBpLCBmbiwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocykge1xyXG4gICAgdmFyIHByb2cgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XHJcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG5cclxuICAgICAgcmV0dXJuIGZuLmNhbGwoY29udGFpbmVyLFxyXG4gICAgICAgICAgY29udGV4dCxcclxuICAgICAgICAgIGNvbnRhaW5lci5oZWxwZXJzLCBjb250YWluZXIucGFydGlhbHMsXHJcbiAgICAgICAgICBvcHRpb25zLmRhdGEgfHwgZGF0YSxcclxuICAgICAgICAgIGJsb2NrUGFyYW1zICYmIFtvcHRpb25zLmJsb2NrUGFyYW1zXS5jb25jYXQoYmxvY2tQYXJhbXMpLFxyXG4gICAgICAgICAgZGVwdGhzICYmIFtjb250ZXh0XS5jb25jYXQoZGVwdGhzKSk7XHJcbiAgICB9O1xyXG4gICAgcHJvZy5wcm9ncmFtID0gaTtcclxuICAgIHByb2cuZGVwdGggPSBkZXB0aHMgPyBkZXB0aHMubGVuZ3RoIDogMDtcclxuICAgIHByb2cuYmxvY2tQYXJhbXMgPSBkZWNsYXJlZEJsb2NrUGFyYW1zIHx8IDA7XHJcbiAgICByZXR1cm4gcHJvZztcclxuICB9XHJcblxyXG4gIF9fZXhwb3J0c19fLnByb2dyYW0gPSBwcm9ncmFtO2Z1bmN0aW9uIHJlc29sdmVQYXJ0aWFsKHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpIHtcclxuICAgIGlmICghcGFydGlhbCkge1xyXG4gICAgICBwYXJ0aWFsID0gb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdO1xyXG4gICAgfSBlbHNlIGlmICghcGFydGlhbC5jYWxsICYmICFvcHRpb25zLm5hbWUpIHtcclxuICAgICAgLy8gVGhpcyBpcyBhIGR5bmFtaWMgcGFydGlhbCB0aGF0IHJldHVybmVkIGEgc3RyaW5nXHJcbiAgICAgIG9wdGlvbnMubmFtZSA9IHBhcnRpYWw7XHJcbiAgICAgIHBhcnRpYWwgPSBvcHRpb25zLnBhcnRpYWxzW3BhcnRpYWxdO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhcnRpYWw7XHJcbiAgfVxyXG5cclxuICBfX2V4cG9ydHNfXy5yZXNvbHZlUGFydGlhbCA9IHJlc29sdmVQYXJ0aWFsO2Z1bmN0aW9uIGludm9rZVBhcnRpYWwocGFydGlhbCwgY29udGV4dCwgb3B0aW9ucykge1xyXG4gICAgb3B0aW9ucy5wYXJ0aWFsID0gdHJ1ZTtcclxuXHJcbiAgICBpZihwYXJ0aWFsID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgb3B0aW9ucy5uYW1lICsgXCIgY291bGQgbm90IGJlIGZvdW5kXCIpO1xyXG4gICAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xyXG4gICAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIF9fZXhwb3J0c19fLmludm9rZVBhcnRpYWwgPSBpbnZva2VQYXJ0aWFsO2Z1bmN0aW9uIG5vb3AoKSB7IHJldHVybiBcIlwiOyB9XHJcblxyXG4gIF9fZXhwb3J0c19fLm5vb3AgPSBub29wO2Z1bmN0aW9uIGluaXREYXRhKGNvbnRleHQsIGRhdGEpIHtcclxuICAgIGlmICghZGF0YSB8fCAhKCdyb290JyBpbiBkYXRhKSkge1xyXG4gICAgICBkYXRhID0gZGF0YSA/IGNyZWF0ZUZyYW1lKGRhdGEpIDoge307XHJcbiAgICAgIGRhdGEucm9vdCA9IGNvbnRleHQ7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZGF0YTtcclxuICB9XHJcbiAgcmV0dXJuIF9fZXhwb3J0c19fO1xyXG59KShfX21vZHVsZTNfXywgX19tb2R1bGU0X18sIF9fbW9kdWxlMl9fKTtcclxuXHJcbi8vIGhhbmRsZWJhcnMucnVudGltZS5qc1xyXG52YXIgX19tb2R1bGUxX18gPSAoZnVuY3Rpb24oX19kZXBlbmRlbmN5MV9fLCBfX2RlcGVuZGVuY3kyX18sIF9fZGVwZW5kZW5jeTNfXywgX19kZXBlbmRlbmN5NF9fLCBfX2RlcGVuZGVuY3k1X18pIHtcclxuICBcInVzZSBzdHJpY3RcIjtcclxuICB2YXIgX19leHBvcnRzX187XHJcbiAgLypnbG9iYWxzIEhhbmRsZWJhcnM6IHRydWUgKi9cclxuICB2YXIgYmFzZSA9IF9fZGVwZW5kZW5jeTFfXztcclxuXHJcbiAgLy8gRWFjaCBvZiB0aGVzZSBhdWdtZW50IHRoZSBIYW5kbGViYXJzIG9iamVjdC4gTm8gbmVlZCB0byBzZXR1cCBoZXJlLlxyXG4gIC8vIChUaGlzIGlzIGRvbmUgdG8gZWFzaWx5IHNoYXJlIGNvZGUgYmV0d2VlbiBjb21tb25qcyBhbmQgYnJvd3NlIGVudnMpXHJcbiAgdmFyIFNhZmVTdHJpbmcgPSBfX2RlcGVuZGVuY3kyX187XHJcbiAgdmFyIEV4Y2VwdGlvbiA9IF9fZGVwZW5kZW5jeTNfXztcclxuICB2YXIgVXRpbHMgPSBfX2RlcGVuZGVuY3k0X187XHJcbiAgdmFyIHJ1bnRpbWUgPSBfX2RlcGVuZGVuY3k1X187XHJcblxyXG4gIC8vIEZvciBjb21wYXRpYmlsaXR5IGFuZCB1c2FnZSBvdXRzaWRlIG9mIG1vZHVsZSBzeXN0ZW1zLCBtYWtlIHRoZSBIYW5kbGViYXJzIG9iamVjdCBhIG5hbWVzcGFjZVxyXG4gIHZhciBjcmVhdGUgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBoYiA9IG5ldyBiYXNlLkhhbmRsZWJhcnNFbnZpcm9ubWVudCgpO1xyXG5cclxuICAgIFV0aWxzLmV4dGVuZChoYiwgYmFzZSk7XHJcbiAgICBoYi5TYWZlU3RyaW5nID0gU2FmZVN0cmluZztcclxuICAgIGhiLkV4Y2VwdGlvbiA9IEV4Y2VwdGlvbjtcclxuICAgIGhiLlV0aWxzID0gVXRpbHM7XHJcbiAgICBoYi5lc2NhcGVFeHByZXNzaW9uID0gVXRpbHMuZXNjYXBlRXhwcmVzc2lvbjtcclxuXHJcbiAgICBoYi5WTSA9IHJ1bnRpbWU7XHJcbiAgICBoYi50ZW1wbGF0ZSA9IGZ1bmN0aW9uKHNwZWMpIHtcclxuICAgICAgcmV0dXJuIHJ1bnRpbWUudGVtcGxhdGUoc3BlYywgaGIpO1xyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gaGI7XHJcbiAgfTtcclxuXHJcbiAgdmFyIEhhbmRsZWJhcnMgPSBjcmVhdGUoKTtcclxuICBIYW5kbGViYXJzLmNyZWF0ZSA9IGNyZWF0ZTtcclxuXHJcbiAgLypqc2hpbnQgLVcwNDAgKi9cclxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gIHZhciByb290ID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB3aW5kb3csXHJcbiAgICAgICRIYW5kbGViYXJzID0gcm9vdC5IYW5kbGViYXJzO1xyXG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgSGFuZGxlYmFycy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICBpZiAocm9vdC5IYW5kbGViYXJzID09PSBIYW5kbGViYXJzKSB7XHJcbiAgICAgIHJvb3QuSGFuZGxlYmFycyA9ICRIYW5kbGViYXJzO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIEhhbmRsZWJhcnNbJ2RlZmF1bHQnXSA9IEhhbmRsZWJhcnM7XHJcblxyXG4gIF9fZXhwb3J0c19fID0gSGFuZGxlYmFycztcclxuICByZXR1cm4gX19leHBvcnRzX187XHJcbn0pKF9fbW9kdWxlMl9fLCBfX21vZHVsZTVfXywgX19tb2R1bGU0X18sIF9fbW9kdWxlM19fLCBfX21vZHVsZTZfXyk7XHJcblxyXG4vLyBoYW5kbGViYXJzL2NvbXBpbGVyL2FzdC5qc1xyXG52YXIgX19tb2R1bGU3X18gPSAoZnVuY3Rpb24oKSB7XHJcbiAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgdmFyIF9fZXhwb3J0c19fO1xyXG4gIHZhciBBU1QgPSB7XHJcbiAgICBQcm9ncmFtOiBmdW5jdGlvbihzdGF0ZW1lbnRzLCBibG9ja1BhcmFtcywgc3RyaXAsIGxvY0luZm8pIHtcclxuICAgICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xyXG4gICAgICB0aGlzLnR5cGUgPSAnUHJvZ3JhbSc7XHJcbiAgICAgIHRoaXMuYm9keSA9IHN0YXRlbWVudHM7XHJcblxyXG4gICAgICB0aGlzLmJsb2NrUGFyYW1zID0gYmxvY2tQYXJhbXM7XHJcbiAgICAgIHRoaXMuc3RyaXAgPSBzdHJpcDtcclxuICAgIH0sXHJcblxyXG4gICAgTXVzdGFjaGVTdGF0ZW1lbnQ6IGZ1bmN0aW9uKHBhdGgsIHBhcmFtcywgaGFzaCwgZXNjYXBlZCwgc3RyaXAsIGxvY0luZm8pIHtcclxuICAgICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xyXG4gICAgICB0aGlzLnR5cGUgPSAnTXVzdGFjaGVTdGF0ZW1lbnQnO1xyXG5cclxuICAgICAgdGhpcy5wYXRoID0gcGF0aDtcclxuICAgICAgdGhpcy5wYXJhbXMgPSBwYXJhbXMgfHwgW107XHJcbiAgICAgIHRoaXMuaGFzaCA9IGhhc2g7XHJcbiAgICAgIHRoaXMuZXNjYXBlZCA9IGVzY2FwZWQ7XHJcblxyXG4gICAgICB0aGlzLnN0cmlwID0gc3RyaXA7XHJcbiAgICB9LFxyXG5cclxuICAgIEJsb2NrU3RhdGVtZW50OiBmdW5jdGlvbihwYXRoLCBwYXJhbXMsIGhhc2gsIHByb2dyYW0sIGludmVyc2UsIG9wZW5TdHJpcCwgaW52ZXJzZVN0cmlwLCBjbG9zZVN0cmlwLCBsb2NJbmZvKSB7XHJcbiAgICAgIHRoaXMubG9jID0gbG9jSW5mbztcclxuICAgICAgdGhpcy50eXBlID0gJ0Jsb2NrU3RhdGVtZW50JztcclxuXHJcbiAgICAgIHRoaXMucGF0aCA9IHBhdGg7XHJcbiAgICAgIHRoaXMucGFyYW1zID0gcGFyYW1zIHx8IFtdO1xyXG4gICAgICB0aGlzLmhhc2ggPSBoYXNoO1xyXG4gICAgICB0aGlzLnByb2dyYW0gID0gcHJvZ3JhbTtcclxuICAgICAgdGhpcy5pbnZlcnNlICA9IGludmVyc2U7XHJcblxyXG4gICAgICB0aGlzLm9wZW5TdHJpcCA9IG9wZW5TdHJpcDtcclxuICAgICAgdGhpcy5pbnZlcnNlU3RyaXAgPSBpbnZlcnNlU3RyaXA7XHJcbiAgICAgIHRoaXMuY2xvc2VTdHJpcCA9IGNsb3NlU3RyaXA7XHJcbiAgICB9LFxyXG5cclxuICAgIFBhcnRpYWxTdGF0ZW1lbnQ6IGZ1bmN0aW9uKG5hbWUsIHBhcmFtcywgaGFzaCwgc3RyaXAsIGxvY0luZm8pIHtcclxuICAgICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xyXG4gICAgICB0aGlzLnR5cGUgPSAnUGFydGlhbFN0YXRlbWVudCc7XHJcblxyXG4gICAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gICAgICB0aGlzLnBhcmFtcyA9IHBhcmFtcyB8fCBbXTtcclxuICAgICAgdGhpcy5oYXNoID0gaGFzaDtcclxuXHJcbiAgICAgIHRoaXMuaW5kZW50ID0gJyc7XHJcbiAgICAgIHRoaXMuc3RyaXAgPSBzdHJpcDtcclxuICAgIH0sXHJcblxyXG4gICAgQ29udGVudFN0YXRlbWVudDogZnVuY3Rpb24oc3RyaW5nLCBsb2NJbmZvKSB7XHJcbiAgICAgIHRoaXMubG9jID0gbG9jSW5mbztcclxuICAgICAgdGhpcy50eXBlID0gJ0NvbnRlbnRTdGF0ZW1lbnQnO1xyXG4gICAgICB0aGlzLm9yaWdpbmFsID0gdGhpcy52YWx1ZSA9IHN0cmluZztcclxuICAgIH0sXHJcblxyXG4gICAgQ29tbWVudFN0YXRlbWVudDogZnVuY3Rpb24oY29tbWVudCwgc3RyaXAsIGxvY0luZm8pIHtcclxuICAgICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xyXG4gICAgICB0aGlzLnR5cGUgPSAnQ29tbWVudFN0YXRlbWVudCc7XHJcbiAgICAgIHRoaXMudmFsdWUgPSBjb21tZW50O1xyXG5cclxuICAgICAgdGhpcy5zdHJpcCA9IHN0cmlwO1xyXG4gICAgfSxcclxuXHJcbiAgICBTdWJFeHByZXNzaW9uOiBmdW5jdGlvbihwYXRoLCBwYXJhbXMsIGhhc2gsIGxvY0luZm8pIHtcclxuICAgICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xyXG5cclxuICAgICAgdGhpcy50eXBlID0gJ1N1YkV4cHJlc3Npb24nO1xyXG4gICAgICB0aGlzLnBhdGggPSBwYXRoO1xyXG4gICAgICB0aGlzLnBhcmFtcyA9IHBhcmFtcyB8fCBbXTtcclxuICAgICAgdGhpcy5oYXNoID0gaGFzaDtcclxuICAgIH0sXHJcblxyXG4gICAgUGF0aEV4cHJlc3Npb246IGZ1bmN0aW9uKGRhdGEsIGRlcHRoLCBwYXJ0cywgb3JpZ2luYWwsIGxvY0luZm8pIHtcclxuICAgICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xyXG4gICAgICB0aGlzLnR5cGUgPSAnUGF0aEV4cHJlc3Npb24nO1xyXG5cclxuICAgICAgdGhpcy5kYXRhID0gZGF0YTtcclxuICAgICAgdGhpcy5vcmlnaW5hbCA9IG9yaWdpbmFsO1xyXG4gICAgICB0aGlzLnBhcnRzICAgID0gcGFydHM7XHJcbiAgICAgIHRoaXMuZGVwdGggICAgPSBkZXB0aDtcclxuICAgIH0sXHJcblxyXG4gICAgU3RyaW5nTGl0ZXJhbDogZnVuY3Rpb24oc3RyaW5nLCBsb2NJbmZvKSB7XHJcbiAgICAgIHRoaXMubG9jID0gbG9jSW5mbztcclxuICAgICAgdGhpcy50eXBlID0gJ1N0cmluZ0xpdGVyYWwnO1xyXG4gICAgICB0aGlzLm9yaWdpbmFsID1cclxuICAgICAgICB0aGlzLnZhbHVlID0gc3RyaW5nO1xyXG4gICAgfSxcclxuXHJcbiAgICBOdW1iZXJMaXRlcmFsOiBmdW5jdGlvbihudW1iZXIsIGxvY0luZm8pIHtcclxuICAgICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xyXG4gICAgICB0aGlzLnR5cGUgPSAnTnVtYmVyTGl0ZXJhbCc7XHJcbiAgICAgIHRoaXMub3JpZ2luYWwgPVxyXG4gICAgICAgIHRoaXMudmFsdWUgPSBOdW1iZXIobnVtYmVyKTtcclxuICAgIH0sXHJcblxyXG4gICAgQm9vbGVhbkxpdGVyYWw6IGZ1bmN0aW9uKGJvb2wsIGxvY0luZm8pIHtcclxuICAgICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xyXG4gICAgICB0aGlzLnR5cGUgPSAnQm9vbGVhbkxpdGVyYWwnO1xyXG4gICAgICB0aGlzLm9yaWdpbmFsID1cclxuICAgICAgICB0aGlzLnZhbHVlID0gYm9vbCA9PT0gJ3RydWUnO1xyXG4gICAgfSxcclxuXHJcbiAgICBIYXNoOiBmdW5jdGlvbihwYWlycywgbG9jSW5mbykge1xyXG4gICAgICB0aGlzLmxvYyA9IGxvY0luZm87XHJcbiAgICAgIHRoaXMudHlwZSA9ICdIYXNoJztcclxuICAgICAgdGhpcy5wYWlycyA9IHBhaXJzO1xyXG4gICAgfSxcclxuICAgIEhhc2hQYWlyOiBmdW5jdGlvbihrZXksIHZhbHVlLCBsb2NJbmZvKSB7XHJcbiAgICAgIHRoaXMubG9jID0gbG9jSW5mbztcclxuICAgICAgdGhpcy50eXBlID0gJ0hhc2hQYWlyJztcclxuICAgICAgdGhpcy5rZXkgPSBrZXk7XHJcbiAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gUHVibGljIEFQSSB1c2VkIHRvIGV2YWx1YXRlIGRlcml2ZWQgYXR0cmlidXRlcyByZWdhcmRpbmcgQVNUIG5vZGVzXHJcbiAgICBoZWxwZXJzOiB7XHJcbiAgICAgIC8vIGEgbXVzdGFjaGUgaXMgZGVmaW5pdGVseSBhIGhlbHBlciBpZjpcclxuICAgICAgLy8gKiBpdCBpcyBhbiBlbGlnaWJsZSBoZWxwZXIsIGFuZFxyXG4gICAgICAvLyAqIGl0IGhhcyBhdCBsZWFzdCBvbmUgcGFyYW1ldGVyIG9yIGhhc2ggc2VnbWVudFxyXG4gICAgICAvLyBUT0RPOiBNYWtlIHRoZXNlIHB1YmxpYyB1dGlsaXR5IG1ldGhvZHNcclxuICAgICAgaGVscGVyRXhwcmVzc2lvbjogZnVuY3Rpb24obm9kZSkge1xyXG4gICAgICAgIHJldHVybiAhIShub2RlLnR5cGUgPT09ICdTdWJFeHByZXNzaW9uJyB8fCBub2RlLnBhcmFtcy5sZW5ndGggfHwgbm9kZS5oYXNoKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIHNjb3BlZElkOiBmdW5jdGlvbihwYXRoKSB7XHJcbiAgICAgICAgcmV0dXJuICgvXlxcLnx0aGlzXFxiLykudGVzdChwYXRoLm9yaWdpbmFsKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIGFuIElEIGlzIHNpbXBsZSBpZiBpdCBvbmx5IGhhcyBvbmUgcGFydCwgYW5kIHRoYXQgcGFydCBpcyBub3RcclxuICAgICAgLy8gYC4uYCBvciBgdGhpc2AuXHJcbiAgICAgIHNpbXBsZUlkOiBmdW5jdGlvbihwYXRoKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhdGgucGFydHMubGVuZ3RoID09PSAxICYmICFBU1QuaGVscGVycy5zY29wZWRJZChwYXRoKSAmJiAhcGF0aC5kZXB0aDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH07XHJcblxyXG5cclxuICAvLyBNdXN0IGJlIGV4cG9ydGVkIGFzIGFuIG9iamVjdCByYXRoZXIgdGhhbiB0aGUgcm9vdCBvZiB0aGUgbW9kdWxlIGFzIHRoZSBqaXNvbiBsZXhlclxyXG4gIC8vIG11c3QgbW9kaWZ5IHRoZSBvYmplY3QgdG8gb3BlcmF0ZSBwcm9wZXJseS5cclxuICBfX2V4cG9ydHNfXyA9IEFTVDtcclxuICByZXR1cm4gX19leHBvcnRzX187XHJcbn0pKCk7XHJcblxyXG4vLyBoYW5kbGViYXJzL2NvbXBpbGVyL3BhcnNlci5qc1xyXG52YXIgX19tb2R1bGU5X18gPSAoZnVuY3Rpb24oKSB7XHJcbiAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgdmFyIF9fZXhwb3J0c19fO1xyXG4gIC8qIGpzaGludCBpZ25vcmU6c3RhcnQgKi9cclxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gIC8qIEppc29uIGdlbmVyYXRlZCBwYXJzZXIgKi9cclxuICB2YXIgaGFuZGxlYmFycyA9IChmdW5jdGlvbigpe1xyXG4gIHZhciBwYXJzZXIgPSB7dHJhY2U6IGZ1bmN0aW9uIHRyYWNlKCkgeyB9LFxyXG4gIHl5OiB7fSxcclxuICBzeW1ib2xzXzoge1wiZXJyb3JcIjoyLFwicm9vdFwiOjMsXCJwcm9ncmFtXCI6NCxcIkVPRlwiOjUsXCJwcm9ncmFtX3JlcGV0aXRpb24wXCI6NixcInN0YXRlbWVudFwiOjcsXCJtdXN0YWNoZVwiOjgsXCJibG9ja1wiOjksXCJyYXdCbG9ja1wiOjEwLFwicGFydGlhbFwiOjExLFwiY29udGVudFwiOjEyLFwiQ09NTUVOVFwiOjEzLFwiQ09OVEVOVFwiOjE0LFwib3BlblJhd0Jsb2NrXCI6MTUsXCJFTkRfUkFXX0JMT0NLXCI6MTYsXCJPUEVOX1JBV19CTE9DS1wiOjE3LFwiaGVscGVyTmFtZVwiOjE4LFwib3BlblJhd0Jsb2NrX3JlcGV0aXRpb24wXCI6MTksXCJvcGVuUmF3QmxvY2tfb3B0aW9uMFwiOjIwLFwiQ0xPU0VfUkFXX0JMT0NLXCI6MjEsXCJvcGVuQmxvY2tcIjoyMixcImJsb2NrX29wdGlvbjBcIjoyMyxcImNsb3NlQmxvY2tcIjoyNCxcIm9wZW5JbnZlcnNlXCI6MjUsXCJibG9ja19vcHRpb24xXCI6MjYsXCJPUEVOX0JMT0NLXCI6MjcsXCJvcGVuQmxvY2tfcmVwZXRpdGlvbjBcIjoyOCxcIm9wZW5CbG9ja19vcHRpb24wXCI6MjksXCJvcGVuQmxvY2tfb3B0aW9uMVwiOjMwLFwiQ0xPU0VcIjozMSxcIk9QRU5fSU5WRVJTRVwiOjMyLFwib3BlbkludmVyc2VfcmVwZXRpdGlvbjBcIjozMyxcIm9wZW5JbnZlcnNlX29wdGlvbjBcIjozNCxcIm9wZW5JbnZlcnNlX29wdGlvbjFcIjozNSxcIm9wZW5JbnZlcnNlQ2hhaW5cIjozNixcIk9QRU5fSU5WRVJTRV9DSEFJTlwiOjM3LFwib3BlbkludmVyc2VDaGFpbl9yZXBldGl0aW9uMFwiOjM4LFwib3BlbkludmVyc2VDaGFpbl9vcHRpb24wXCI6MzksXCJvcGVuSW52ZXJzZUNoYWluX29wdGlvbjFcIjo0MCxcImludmVyc2VBbmRQcm9ncmFtXCI6NDEsXCJJTlZFUlNFXCI6NDIsXCJpbnZlcnNlQ2hhaW5cIjo0MyxcImludmVyc2VDaGFpbl9vcHRpb24wXCI6NDQsXCJPUEVOX0VOREJMT0NLXCI6NDUsXCJPUEVOXCI6NDYsXCJtdXN0YWNoZV9yZXBldGl0aW9uMFwiOjQ3LFwibXVzdGFjaGVfb3B0aW9uMFwiOjQ4LFwiT1BFTl9VTkVTQ0FQRURcIjo0OSxcIm11c3RhY2hlX3JlcGV0aXRpb24xXCI6NTAsXCJtdXN0YWNoZV9vcHRpb24xXCI6NTEsXCJDTE9TRV9VTkVTQ0FQRURcIjo1MixcIk9QRU5fUEFSVElBTFwiOjUzLFwicGFydGlhbE5hbWVcIjo1NCxcInBhcnRpYWxfcmVwZXRpdGlvbjBcIjo1NSxcInBhcnRpYWxfb3B0aW9uMFwiOjU2LFwicGFyYW1cIjo1NyxcInNleHByXCI6NTgsXCJPUEVOX1NFWFBSXCI6NTksXCJzZXhwcl9yZXBldGl0aW9uMFwiOjYwLFwic2V4cHJfb3B0aW9uMFwiOjYxLFwiQ0xPU0VfU0VYUFJcIjo2MixcImhhc2hcIjo2MyxcImhhc2hfcmVwZXRpdGlvbl9wbHVzMFwiOjY0LFwiaGFzaFNlZ21lbnRcIjo2NSxcIklEXCI6NjYsXCJFUVVBTFNcIjo2NyxcImJsb2NrUGFyYW1zXCI6NjgsXCJPUEVOX0JMT0NLX1BBUkFNU1wiOjY5LFwiYmxvY2tQYXJhbXNfcmVwZXRpdGlvbl9wbHVzMFwiOjcwLFwiQ0xPU0VfQkxPQ0tfUEFSQU1TXCI6NzEsXCJwYXRoXCI6NzIsXCJkYXRhTmFtZVwiOjczLFwiU1RSSU5HXCI6NzQsXCJOVU1CRVJcIjo3NSxcIkJPT0xFQU5cIjo3NixcIkRBVEFcIjo3NyxcInBhdGhTZWdtZW50c1wiOjc4LFwiU0VQXCI6NzksXCIkYWNjZXB0XCI6MCxcIiRlbmRcIjoxfSxcclxuICB0ZXJtaW5hbHNfOiB7MjpcImVycm9yXCIsNTpcIkVPRlwiLDEzOlwiQ09NTUVOVFwiLDE0OlwiQ09OVEVOVFwiLDE2OlwiRU5EX1JBV19CTE9DS1wiLDE3OlwiT1BFTl9SQVdfQkxPQ0tcIiwyMTpcIkNMT1NFX1JBV19CTE9DS1wiLDI3OlwiT1BFTl9CTE9DS1wiLDMxOlwiQ0xPU0VcIiwzMjpcIk9QRU5fSU5WRVJTRVwiLDM3OlwiT1BFTl9JTlZFUlNFX0NIQUlOXCIsNDI6XCJJTlZFUlNFXCIsNDU6XCJPUEVOX0VOREJMT0NLXCIsNDY6XCJPUEVOXCIsNDk6XCJPUEVOX1VORVNDQVBFRFwiLDUyOlwiQ0xPU0VfVU5FU0NBUEVEXCIsNTM6XCJPUEVOX1BBUlRJQUxcIiw1OTpcIk9QRU5fU0VYUFJcIiw2MjpcIkNMT1NFX1NFWFBSXCIsNjY6XCJJRFwiLDY3OlwiRVFVQUxTXCIsNjk6XCJPUEVOX0JMT0NLX1BBUkFNU1wiLDcxOlwiQ0xPU0VfQkxPQ0tfUEFSQU1TXCIsNzQ6XCJTVFJJTkdcIiw3NTpcIk5VTUJFUlwiLDc2OlwiQk9PTEVBTlwiLDc3OlwiREFUQVwiLDc5OlwiU0VQXCJ9LFxyXG4gIHByb2R1Y3Rpb25zXzogWzAsWzMsMl0sWzQsMV0sWzcsMV0sWzcsMV0sWzcsMV0sWzcsMV0sWzcsMV0sWzcsMV0sWzEyLDFdLFsxMCwzXSxbMTUsNV0sWzksNF0sWzksNF0sWzIyLDZdLFsyNSw2XSxbMzYsNl0sWzQxLDJdLFs0MywzXSxbNDMsMV0sWzI0LDNdLFs4LDVdLFs4LDVdLFsxMSw1XSxbNTcsMV0sWzU3LDFdLFs1OCw1XSxbNjMsMV0sWzY1LDNdLFs2OCwzXSxbMTgsMV0sWzE4LDFdLFsxOCwxXSxbMTgsMV0sWzE4LDFdLFs1NCwxXSxbNTQsMV0sWzczLDJdLFs3MiwxXSxbNzgsM10sWzc4LDFdLFs2LDBdLFs2LDJdLFsxOSwwXSxbMTksMl0sWzIwLDBdLFsyMCwxXSxbMjMsMF0sWzIzLDFdLFsyNiwwXSxbMjYsMV0sWzI4LDBdLFsyOCwyXSxbMjksMF0sWzI5LDFdLFszMCwwXSxbMzAsMV0sWzMzLDBdLFszMywyXSxbMzQsMF0sWzM0LDFdLFszNSwwXSxbMzUsMV0sWzM4LDBdLFszOCwyXSxbMzksMF0sWzM5LDFdLFs0MCwwXSxbNDAsMV0sWzQ0LDBdLFs0NCwxXSxbNDcsMF0sWzQ3LDJdLFs0OCwwXSxbNDgsMV0sWzUwLDBdLFs1MCwyXSxbNTEsMF0sWzUxLDFdLFs1NSwwXSxbNTUsMl0sWzU2LDBdLFs1NiwxXSxbNjAsMF0sWzYwLDJdLFs2MSwwXSxbNjEsMV0sWzY0LDFdLFs2NCwyXSxbNzAsMV0sWzcwLDJdXSxcclxuICBwZXJmb3JtQWN0aW9uOiBmdW5jdGlvbiBhbm9ueW1vdXMoeXl0ZXh0LHl5bGVuZyx5eWxpbmVubyx5eSx5eXN0YXRlLCQkLF8kKSB7XHJcblxyXG4gIHZhciAkMCA9ICQkLmxlbmd0aCAtIDE7XHJcbiAgc3dpdGNoICh5eXN0YXRlKSB7XHJcbiAgY2FzZSAxOiByZXR1cm4gJCRbJDAtMV07IFxyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMjp0aGlzLiQgPSBuZXcgeXkuUHJvZ3JhbSgkJFskMF0sIG51bGwsIHt9LCB5eS5sb2NJbmZvKHRoaXMuXyQpKTtcclxuICBicmVhaztcclxuICBjYXNlIDM6dGhpcy4kID0gJCRbJDBdO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgNDp0aGlzLiQgPSAkJFskMF07XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSA1OnRoaXMuJCA9ICQkWyQwXTtcclxuICBicmVhaztcclxuICBjYXNlIDY6dGhpcy4kID0gJCRbJDBdO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgNzp0aGlzLiQgPSAkJFskMF07XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSA4OnRoaXMuJCA9IG5ldyB5eS5Db21tZW50U3RhdGVtZW50KHl5LnN0cmlwQ29tbWVudCgkJFskMF0pLCB5eS5zdHJpcEZsYWdzKCQkWyQwXSwgJCRbJDBdKSwgeXkubG9jSW5mbyh0aGlzLl8kKSk7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSA5OnRoaXMuJCA9IG5ldyB5eS5Db250ZW50U3RhdGVtZW50KCQkWyQwXSwgeXkubG9jSW5mbyh0aGlzLl8kKSk7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAxMDp0aGlzLiQgPSB5eS5wcmVwYXJlUmF3QmxvY2soJCRbJDAtMl0sICQkWyQwLTFdLCAkJFskMF0sIHRoaXMuXyQpO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMTE6dGhpcy4kID0geyBwYXRoOiAkJFskMC0zXSwgcGFyYW1zOiAkJFskMC0yXSwgaGFzaDogJCRbJDAtMV0gfTtcclxuICBicmVhaztcclxuICBjYXNlIDEyOnRoaXMuJCA9IHl5LnByZXBhcmVCbG9jaygkJFskMC0zXSwgJCRbJDAtMl0sICQkWyQwLTFdLCAkJFskMF0sIGZhbHNlLCB0aGlzLl8kKTtcclxuICBicmVhaztcclxuICBjYXNlIDEzOnRoaXMuJCA9IHl5LnByZXBhcmVCbG9jaygkJFskMC0zXSwgJCRbJDAtMl0sICQkWyQwLTFdLCAkJFskMF0sIHRydWUsIHRoaXMuXyQpO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMTQ6dGhpcy4kID0geyBwYXRoOiAkJFskMC00XSwgcGFyYW1zOiAkJFskMC0zXSwgaGFzaDogJCRbJDAtMl0sIGJsb2NrUGFyYW1zOiAkJFskMC0xXSwgc3RyaXA6IHl5LnN0cmlwRmxhZ3MoJCRbJDAtNV0sICQkWyQwXSkgfTtcclxuICBicmVhaztcclxuICBjYXNlIDE1OnRoaXMuJCA9IHsgcGF0aDogJCRbJDAtNF0sIHBhcmFtczogJCRbJDAtM10sIGhhc2g6ICQkWyQwLTJdLCBibG9ja1BhcmFtczogJCRbJDAtMV0sIHN0cmlwOiB5eS5zdHJpcEZsYWdzKCQkWyQwLTVdLCAkJFskMF0pIH07XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAxNjp0aGlzLiQgPSB7IHBhdGg6ICQkWyQwLTRdLCBwYXJhbXM6ICQkWyQwLTNdLCBoYXNoOiAkJFskMC0yXSwgYmxvY2tQYXJhbXM6ICQkWyQwLTFdLCBzdHJpcDogeXkuc3RyaXBGbGFncygkJFskMC01XSwgJCRbJDBdKSB9O1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMTc6dGhpcy4kID0geyBzdHJpcDogeXkuc3RyaXBGbGFncygkJFskMC0xXSwgJCRbJDAtMV0pLCBwcm9ncmFtOiAkJFskMF0gfTtcclxuICBicmVhaztcclxuICBjYXNlIDE4OlxyXG4gICAgICB2YXIgaW52ZXJzZSA9IHl5LnByZXBhcmVCbG9jaygkJFskMC0yXSwgJCRbJDAtMV0sICQkWyQwXSwgJCRbJDBdLCBmYWxzZSwgdGhpcy5fJCksXHJcbiAgICAgICAgICBwcm9ncmFtID0gbmV3IHl5LlByb2dyYW0oW2ludmVyc2VdLCBudWxsLCB7fSwgeXkubG9jSW5mbyh0aGlzLl8kKSk7XHJcbiAgICAgIHByb2dyYW0uY2hhaW5lZCA9IHRydWU7XHJcblxyXG4gICAgICB0aGlzLiQgPSB7IHN0cmlwOiAkJFskMC0yXS5zdHJpcCwgcHJvZ3JhbTogcHJvZ3JhbSwgY2hhaW46IHRydWUgfTtcclxuICAgIFxyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMTk6dGhpcy4kID0gJCRbJDBdO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMjA6dGhpcy4kID0ge3BhdGg6ICQkWyQwLTFdLCBzdHJpcDogeXkuc3RyaXBGbGFncygkJFskMC0yXSwgJCRbJDBdKX07XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAyMTp0aGlzLiQgPSB5eS5wcmVwYXJlTXVzdGFjaGUoJCRbJDAtM10sICQkWyQwLTJdLCAkJFskMC0xXSwgJCRbJDAtNF0sIHl5LnN0cmlwRmxhZ3MoJCRbJDAtNF0sICQkWyQwXSksIHRoaXMuXyQpO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMjI6dGhpcy4kID0geXkucHJlcGFyZU11c3RhY2hlKCQkWyQwLTNdLCAkJFskMC0yXSwgJCRbJDAtMV0sICQkWyQwLTRdLCB5eS5zdHJpcEZsYWdzKCQkWyQwLTRdLCAkJFskMF0pLCB0aGlzLl8kKTtcclxuICBicmVhaztcclxuICBjYXNlIDIzOnRoaXMuJCA9IG5ldyB5eS5QYXJ0aWFsU3RhdGVtZW50KCQkWyQwLTNdLCAkJFskMC0yXSwgJCRbJDAtMV0sIHl5LnN0cmlwRmxhZ3MoJCRbJDAtNF0sICQkWyQwXSksIHl5LmxvY0luZm8odGhpcy5fJCkpO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMjQ6dGhpcy4kID0gJCRbJDBdO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMjU6dGhpcy4kID0gJCRbJDBdO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMjY6dGhpcy4kID0gbmV3IHl5LlN1YkV4cHJlc3Npb24oJCRbJDAtM10sICQkWyQwLTJdLCAkJFskMC0xXSwgeXkubG9jSW5mbyh0aGlzLl8kKSk7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAyNzp0aGlzLiQgPSBuZXcgeXkuSGFzaCgkJFskMF0sIHl5LmxvY0luZm8odGhpcy5fJCkpO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMjg6dGhpcy4kID0gbmV3IHl5Lkhhc2hQYWlyKCQkWyQwLTJdLCAkJFskMF0sIHl5LmxvY0luZm8odGhpcy5fJCkpO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMjk6dGhpcy4kID0gJCRbJDAtMV07XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAzMDp0aGlzLiQgPSAkJFskMF07XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAzMTp0aGlzLiQgPSAkJFskMF07XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAzMjp0aGlzLiQgPSBuZXcgeXkuU3RyaW5nTGl0ZXJhbCgkJFskMF0sIHl5LmxvY0luZm8odGhpcy5fJCkpO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMzM6dGhpcy4kID0gbmV3IHl5Lk51bWJlckxpdGVyYWwoJCRbJDBdLCB5eS5sb2NJbmZvKHRoaXMuXyQpKTtcclxuICBicmVhaztcclxuICBjYXNlIDM0OnRoaXMuJCA9IG5ldyB5eS5Cb29sZWFuTGl0ZXJhbCgkJFskMF0sIHl5LmxvY0luZm8odGhpcy5fJCkpO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMzU6dGhpcy4kID0gJCRbJDBdO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMzY6dGhpcy4kID0gJCRbJDBdO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMzc6dGhpcy4kID0geXkucHJlcGFyZVBhdGgodHJ1ZSwgJCRbJDBdLCB0aGlzLl8kKTtcclxuICBicmVhaztcclxuICBjYXNlIDM4OnRoaXMuJCA9IHl5LnByZXBhcmVQYXRoKGZhbHNlLCAkJFskMF0sIHRoaXMuXyQpO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMzk6ICQkWyQwLTJdLnB1c2goe3BhcnQ6ICQkWyQwXSwgc2VwYXJhdG9yOiAkJFskMC0xXX0pOyB0aGlzLiQgPSAkJFskMC0yXTsgXHJcbiAgYnJlYWs7XHJcbiAgY2FzZSA0MDp0aGlzLiQgPSBbe3BhcnQ6ICQkWyQwXX1dO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgNDE6dGhpcy4kID0gW107XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSA0MjokJFskMC0xXS5wdXNoKCQkWyQwXSk7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSA0Mzp0aGlzLiQgPSBbXTtcclxuICBicmVhaztcclxuICBjYXNlIDQ0OiQkWyQwLTFdLnB1c2goJCRbJDBdKTtcclxuICBicmVhaztcclxuICBjYXNlIDUxOnRoaXMuJCA9IFtdO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgNTI6JCRbJDAtMV0ucHVzaCgkJFskMF0pO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgNTc6dGhpcy4kID0gW107XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSA1ODokJFskMC0xXS5wdXNoKCQkWyQwXSk7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSA2Mzp0aGlzLiQgPSBbXTtcclxuICBicmVhaztcclxuICBjYXNlIDY0OiQkWyQwLTFdLnB1c2goJCRbJDBdKTtcclxuICBicmVhaztcclxuICBjYXNlIDcxOnRoaXMuJCA9IFtdO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgNzI6JCRbJDAtMV0ucHVzaCgkJFskMF0pO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgNzU6dGhpcy4kID0gW107XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSA3NjokJFskMC0xXS5wdXNoKCQkWyQwXSk7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSA3OTp0aGlzLiQgPSBbXTtcclxuICBicmVhaztcclxuICBjYXNlIDgwOiQkWyQwLTFdLnB1c2goJCRbJDBdKTtcclxuICBicmVhaztcclxuICBjYXNlIDgzOnRoaXMuJCA9IFtdO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgODQ6JCRbJDAtMV0ucHVzaCgkJFskMF0pO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgODc6dGhpcy4kID0gWyQkWyQwXV07XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSA4ODokJFskMC0xXS5wdXNoKCQkWyQwXSk7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSA4OTp0aGlzLiQgPSBbJCRbJDBdXTtcclxuICBicmVhaztcclxuICBjYXNlIDkwOiQkWyQwLTFdLnB1c2goJCRbJDBdKTtcclxuICBicmVhaztcclxuICB9XHJcbiAgfSxcclxuICB0YWJsZTogW3szOjEsNDoyLDU6WzIsNDFdLDY6MywxMzpbMiw0MV0sMTQ6WzIsNDFdLDE3OlsyLDQxXSwyNzpbMiw0MV0sMzI6WzIsNDFdLDQ2OlsyLDQxXSw0OTpbMiw0MV0sNTM6WzIsNDFdfSx7MTpbM119LHs1OlsxLDRdfSx7NTpbMiwyXSw3OjUsODo2LDk6NywxMDo4LDExOjksMTI6MTAsMTM6WzEsMTFdLDE0OlsxLDE4XSwxNToxNiwxNzpbMSwyMV0sMjI6MTQsMjU6MTUsMjc6WzEsMTldLDMyOlsxLDIwXSwzNzpbMiwyXSw0MjpbMiwyXSw0NTpbMiwyXSw0NjpbMSwxMl0sNDk6WzEsMTNdLDUzOlsxLDE3XX0sezE6WzIsMV19LHs1OlsyLDQyXSwxMzpbMiw0Ml0sMTQ6WzIsNDJdLDE3OlsyLDQyXSwyNzpbMiw0Ml0sMzI6WzIsNDJdLDM3OlsyLDQyXSw0MjpbMiw0Ml0sNDU6WzIsNDJdLDQ2OlsyLDQyXSw0OTpbMiw0Ml0sNTM6WzIsNDJdfSx7NTpbMiwzXSwxMzpbMiwzXSwxNDpbMiwzXSwxNzpbMiwzXSwyNzpbMiwzXSwzMjpbMiwzXSwzNzpbMiwzXSw0MjpbMiwzXSw0NTpbMiwzXSw0NjpbMiwzXSw0OTpbMiwzXSw1MzpbMiwzXX0sezU6WzIsNF0sMTM6WzIsNF0sMTQ6WzIsNF0sMTc6WzIsNF0sMjc6WzIsNF0sMzI6WzIsNF0sMzc6WzIsNF0sNDI6WzIsNF0sNDU6WzIsNF0sNDY6WzIsNF0sNDk6WzIsNF0sNTM6WzIsNF19LHs1OlsyLDVdLDEzOlsyLDVdLDE0OlsyLDVdLDE3OlsyLDVdLDI3OlsyLDVdLDMyOlsyLDVdLDM3OlsyLDVdLDQyOlsyLDVdLDQ1OlsyLDVdLDQ2OlsyLDVdLDQ5OlsyLDVdLDUzOlsyLDVdfSx7NTpbMiw2XSwxMzpbMiw2XSwxNDpbMiw2XSwxNzpbMiw2XSwyNzpbMiw2XSwzMjpbMiw2XSwzNzpbMiw2XSw0MjpbMiw2XSw0NTpbMiw2XSw0NjpbMiw2XSw0OTpbMiw2XSw1MzpbMiw2XX0sezU6WzIsN10sMTM6WzIsN10sMTQ6WzIsN10sMTc6WzIsN10sMjc6WzIsN10sMzI6WzIsN10sMzc6WzIsN10sNDI6WzIsN10sNDU6WzIsN10sNDY6WzIsN10sNDk6WzIsN10sNTM6WzIsN119LHs1OlsyLDhdLDEzOlsyLDhdLDE0OlsyLDhdLDE3OlsyLDhdLDI3OlsyLDhdLDMyOlsyLDhdLDM3OlsyLDhdLDQyOlsyLDhdLDQ1OlsyLDhdLDQ2OlsyLDhdLDQ5OlsyLDhdLDUzOlsyLDhdfSx7MTg6MjIsNjY6WzEsMzBdLDcyOjIzLDczOjI0LDc0OlsxLDI1XSw3NTpbMSwyNl0sNzY6WzEsMjddLDc3OlsxLDI5XSw3ODoyOH0sezE4OjMxLDY2OlsxLDMwXSw3MjoyMyw3MzoyNCw3NDpbMSwyNV0sNzU6WzEsMjZdLDc2OlsxLDI3XSw3NzpbMSwyOV0sNzg6Mjh9LHs0OjMyLDY6MywxMzpbMiw0MV0sMTQ6WzIsNDFdLDE3OlsyLDQxXSwyNzpbMiw0MV0sMzI6WzIsNDFdLDM3OlsyLDQxXSw0MjpbMiw0MV0sNDU6WzIsNDFdLDQ2OlsyLDQxXSw0OTpbMiw0MV0sNTM6WzIsNDFdfSx7NDozMyw2OjMsMTM6WzIsNDFdLDE0OlsyLDQxXSwxNzpbMiw0MV0sMjc6WzIsNDFdLDMyOlsyLDQxXSw0MjpbMiw0MV0sNDU6WzIsNDFdLDQ2OlsyLDQxXSw0OTpbMiw0MV0sNTM6WzIsNDFdfSx7MTI6MzQsMTQ6WzEsMThdfSx7MTg6MzYsNTQ6MzUsNTg6MzcsNTk6WzEsMzhdLDY2OlsxLDMwXSw3MjoyMyw3MzoyNCw3NDpbMSwyNV0sNzU6WzEsMjZdLDc2OlsxLDI3XSw3NzpbMSwyOV0sNzg6Mjh9LHs1OlsyLDldLDEzOlsyLDldLDE0OlsyLDldLDE2OlsyLDldLDE3OlsyLDldLDI3OlsyLDldLDMyOlsyLDldLDM3OlsyLDldLDQyOlsyLDldLDQ1OlsyLDldLDQ2OlsyLDldLDQ5OlsyLDldLDUzOlsyLDldfSx7MTg6MzksNjY6WzEsMzBdLDcyOjIzLDczOjI0LDc0OlsxLDI1XSw3NTpbMSwyNl0sNzY6WzEsMjddLDc3OlsxLDI5XSw3ODoyOH0sezE4OjQwLDY2OlsxLDMwXSw3MjoyMyw3MzoyNCw3NDpbMSwyNV0sNzU6WzEsMjZdLDc2OlsxLDI3XSw3NzpbMSwyOV0sNzg6Mjh9LHsxODo0MSw2NjpbMSwzMF0sNzI6MjMsNzM6MjQsNzQ6WzEsMjVdLDc1OlsxLDI2XSw3NjpbMSwyN10sNzc6WzEsMjldLDc4OjI4fSx7MzE6WzIsNzFdLDQ3OjQyLDU5OlsyLDcxXSw2NjpbMiw3MV0sNzQ6WzIsNzFdLDc1OlsyLDcxXSw3NjpbMiw3MV0sNzc6WzIsNzFdfSx7MjE6WzIsMzBdLDMxOlsyLDMwXSw1MjpbMiwzMF0sNTk6WzIsMzBdLDYyOlsyLDMwXSw2NjpbMiwzMF0sNjk6WzIsMzBdLDc0OlsyLDMwXSw3NTpbMiwzMF0sNzY6WzIsMzBdLDc3OlsyLDMwXX0sezIxOlsyLDMxXSwzMTpbMiwzMV0sNTI6WzIsMzFdLDU5OlsyLDMxXSw2MjpbMiwzMV0sNjY6WzIsMzFdLDY5OlsyLDMxXSw3NDpbMiwzMV0sNzU6WzIsMzFdLDc2OlsyLDMxXSw3NzpbMiwzMV19LHsyMTpbMiwzMl0sMzE6WzIsMzJdLDUyOlsyLDMyXSw1OTpbMiwzMl0sNjI6WzIsMzJdLDY2OlsyLDMyXSw2OTpbMiwzMl0sNzQ6WzIsMzJdLDc1OlsyLDMyXSw3NjpbMiwzMl0sNzc6WzIsMzJdfSx7MjE6WzIsMzNdLDMxOlsyLDMzXSw1MjpbMiwzM10sNTk6WzIsMzNdLDYyOlsyLDMzXSw2NjpbMiwzM10sNjk6WzIsMzNdLDc0OlsyLDMzXSw3NTpbMiwzM10sNzY6WzIsMzNdLDc3OlsyLDMzXX0sezIxOlsyLDM0XSwzMTpbMiwzNF0sNTI6WzIsMzRdLDU5OlsyLDM0XSw2MjpbMiwzNF0sNjY6WzIsMzRdLDY5OlsyLDM0XSw3NDpbMiwzNF0sNzU6WzIsMzRdLDc2OlsyLDM0XSw3NzpbMiwzNF19LHsyMTpbMiwzOF0sMzE6WzIsMzhdLDUyOlsyLDM4XSw1OTpbMiwzOF0sNjI6WzIsMzhdLDY2OlsyLDM4XSw2OTpbMiwzOF0sNzQ6WzIsMzhdLDc1OlsyLDM4XSw3NjpbMiwzOF0sNzc6WzIsMzhdLDc5OlsxLDQzXX0sezY2OlsxLDMwXSw3ODo0NH0sezIxOlsyLDQwXSwzMTpbMiw0MF0sNTI6WzIsNDBdLDU5OlsyLDQwXSw2MjpbMiw0MF0sNjY6WzIsNDBdLDY5OlsyLDQwXSw3NDpbMiw0MF0sNzU6WzIsNDBdLDc2OlsyLDQwXSw3NzpbMiw0MF0sNzk6WzIsNDBdfSx7NTA6NDUsNTI6WzIsNzVdLDU5OlsyLDc1XSw2NjpbMiw3NV0sNzQ6WzIsNzVdLDc1OlsyLDc1XSw3NjpbMiw3NV0sNzc6WzIsNzVdfSx7MjM6NDYsMzY6NDgsMzc6WzEsNTBdLDQxOjQ5LDQyOlsxLDUxXSw0Mzo0Nyw0NTpbMiw0N119LHsyNjo1Miw0MTo1Myw0MjpbMSw1MV0sNDU6WzIsNDldfSx7MTY6WzEsNTRdfSx7MzE6WzIsNzldLDU1OjU1LDU5OlsyLDc5XSw2NjpbMiw3OV0sNzQ6WzIsNzldLDc1OlsyLDc5XSw3NjpbMiw3OV0sNzc6WzIsNzldfSx7MzE6WzIsMzVdLDU5OlsyLDM1XSw2NjpbMiwzNV0sNzQ6WzIsMzVdLDc1OlsyLDM1XSw3NjpbMiwzNV0sNzc6WzIsMzVdfSx7MzE6WzIsMzZdLDU5OlsyLDM2XSw2NjpbMiwzNl0sNzQ6WzIsMzZdLDc1OlsyLDM2XSw3NjpbMiwzNl0sNzc6WzIsMzZdfSx7MTg6NTYsNjY6WzEsMzBdLDcyOjIzLDczOjI0LDc0OlsxLDI1XSw3NTpbMSwyNl0sNzY6WzEsMjddLDc3OlsxLDI5XSw3ODoyOH0sezI4OjU3LDMxOlsyLDUxXSw1OTpbMiw1MV0sNjY6WzIsNTFdLDY5OlsyLDUxXSw3NDpbMiw1MV0sNzU6WzIsNTFdLDc2OlsyLDUxXSw3NzpbMiw1MV19LHszMTpbMiw1N10sMzM6NTgsNTk6WzIsNTddLDY2OlsyLDU3XSw2OTpbMiw1N10sNzQ6WzIsNTddLDc1OlsyLDU3XSw3NjpbMiw1N10sNzc6WzIsNTddfSx7MTk6NTksMjE6WzIsNDNdLDU5OlsyLDQzXSw2NjpbMiw0M10sNzQ6WzIsNDNdLDc1OlsyLDQzXSw3NjpbMiw0M10sNzc6WzIsNDNdfSx7MTg6NjMsMzE6WzIsNzNdLDQ4OjYwLDU3OjYxLDU4OjY0LDU5OlsxLDM4XSw2Mzo2Miw2NDo2NSw2NTo2Niw2NjpbMSw2N10sNzI6MjMsNzM6MjQsNzQ6WzEsMjVdLDc1OlsxLDI2XSw3NjpbMSwyN10sNzc6WzEsMjldLDc4OjI4fSx7NjY6WzEsNjhdfSx7MjE6WzIsMzddLDMxOlsyLDM3XSw1MjpbMiwzN10sNTk6WzIsMzddLDYyOlsyLDM3XSw2NjpbMiwzN10sNjk6WzIsMzddLDc0OlsyLDM3XSw3NTpbMiwzN10sNzY6WzIsMzddLDc3OlsyLDM3XSw3OTpbMSw0M119LHsxODo2Myw1MTo2OSw1MjpbMiw3N10sNTc6NzAsNTg6NjQsNTk6WzEsMzhdLDYzOjcxLDY0OjY1LDY1OjY2LDY2OlsxLDY3XSw3MjoyMyw3MzoyNCw3NDpbMSwyNV0sNzU6WzEsMjZdLDc2OlsxLDI3XSw3NzpbMSwyOV0sNzg6Mjh9LHsyNDo3Miw0NTpbMSw3M119LHs0NTpbMiw0OF19LHs0Ojc0LDY6MywxMzpbMiw0MV0sMTQ6WzIsNDFdLDE3OlsyLDQxXSwyNzpbMiw0MV0sMzI6WzIsNDFdLDM3OlsyLDQxXSw0MjpbMiw0MV0sNDU6WzIsNDFdLDQ2OlsyLDQxXSw0OTpbMiw0MV0sNTM6WzIsNDFdfSx7NDU6WzIsMTldfSx7MTg6NzUsNjY6WzEsMzBdLDcyOjIzLDczOjI0LDc0OlsxLDI1XSw3NTpbMSwyNl0sNzY6WzEsMjddLDc3OlsxLDI5XSw3ODoyOH0sezQ6NzYsNjozLDEzOlsyLDQxXSwxNDpbMiw0MV0sMTc6WzIsNDFdLDI3OlsyLDQxXSwzMjpbMiw0MV0sNDU6WzIsNDFdLDQ2OlsyLDQxXSw0OTpbMiw0MV0sNTM6WzIsNDFdfSx7MjQ6NzcsNDU6WzEsNzNdfSx7NDU6WzIsNTBdfSx7NTpbMiwxMF0sMTM6WzIsMTBdLDE0OlsyLDEwXSwxNzpbMiwxMF0sMjc6WzIsMTBdLDMyOlsyLDEwXSwzNzpbMiwxMF0sNDI6WzIsMTBdLDQ1OlsyLDEwXSw0NjpbMiwxMF0sNDk6WzIsMTBdLDUzOlsyLDEwXX0sezE4OjYzLDMxOlsyLDgxXSw1Njo3OCw1Nzo3OSw1ODo2NCw1OTpbMSwzOF0sNjM6ODAsNjQ6NjUsNjU6NjYsNjY6WzEsNjddLDcyOjIzLDczOjI0LDc0OlsxLDI1XSw3NTpbMSwyNl0sNzY6WzEsMjddLDc3OlsxLDI5XSw3ODoyOH0sezU5OlsyLDgzXSw2MDo4MSw2MjpbMiw4M10sNjY6WzIsODNdLDc0OlsyLDgzXSw3NTpbMiw4M10sNzY6WzIsODNdLDc3OlsyLDgzXX0sezE4OjYzLDI5OjgyLDMxOlsyLDUzXSw1Nzo4Myw1ODo2NCw1OTpbMSwzOF0sNjM6ODQsNjQ6NjUsNjU6NjYsNjY6WzEsNjddLDY5OlsyLDUzXSw3MjoyMyw3MzoyNCw3NDpbMSwyNV0sNzU6WzEsMjZdLDc2OlsxLDI3XSw3NzpbMSwyOV0sNzg6Mjh9LHsxODo2MywzMTpbMiw1OV0sMzQ6ODUsNTc6ODYsNTg6NjQsNTk6WzEsMzhdLDYzOjg3LDY0OjY1LDY1OjY2LDY2OlsxLDY3XSw2OTpbMiw1OV0sNzI6MjMsNzM6MjQsNzQ6WzEsMjVdLDc1OlsxLDI2XSw3NjpbMSwyN10sNzc6WzEsMjldLDc4OjI4fSx7MTg6NjMsMjA6ODgsMjE6WzIsNDVdLDU3Ojg5LDU4OjY0LDU5OlsxLDM4XSw2Mzo5MCw2NDo2NSw2NTo2Niw2NjpbMSw2N10sNzI6MjMsNzM6MjQsNzQ6WzEsMjVdLDc1OlsxLDI2XSw3NjpbMSwyN10sNzc6WzEsMjldLDc4OjI4fSx7MzE6WzEsOTFdfSx7MzE6WzIsNzJdLDU5OlsyLDcyXSw2NjpbMiw3Ml0sNzQ6WzIsNzJdLDc1OlsyLDcyXSw3NjpbMiw3Ml0sNzc6WzIsNzJdfSx7MzE6WzIsNzRdfSx7MjE6WzIsMjRdLDMxOlsyLDI0XSw1MjpbMiwyNF0sNTk6WzIsMjRdLDYyOlsyLDI0XSw2NjpbMiwyNF0sNjk6WzIsMjRdLDc0OlsyLDI0XSw3NTpbMiwyNF0sNzY6WzIsMjRdLDc3OlsyLDI0XX0sezIxOlsyLDI1XSwzMTpbMiwyNV0sNTI6WzIsMjVdLDU5OlsyLDI1XSw2MjpbMiwyNV0sNjY6WzIsMjVdLDY5OlsyLDI1XSw3NDpbMiwyNV0sNzU6WzIsMjVdLDc2OlsyLDI1XSw3NzpbMiwyNV19LHsyMTpbMiwyN10sMzE6WzIsMjddLDUyOlsyLDI3XSw2MjpbMiwyN10sNjU6OTIsNjY6WzEsOTNdLDY5OlsyLDI3XX0sezIxOlsyLDg3XSwzMTpbMiw4N10sNTI6WzIsODddLDYyOlsyLDg3XSw2NjpbMiw4N10sNjk6WzIsODddfSx7MjE6WzIsNDBdLDMxOlsyLDQwXSw1MjpbMiw0MF0sNTk6WzIsNDBdLDYyOlsyLDQwXSw2NjpbMiw0MF0sNjc6WzEsOTRdLDY5OlsyLDQwXSw3NDpbMiw0MF0sNzU6WzIsNDBdLDc2OlsyLDQwXSw3NzpbMiw0MF0sNzk6WzIsNDBdfSx7MjE6WzIsMzldLDMxOlsyLDM5XSw1MjpbMiwzOV0sNTk6WzIsMzldLDYyOlsyLDM5XSw2NjpbMiwzOV0sNjk6WzIsMzldLDc0OlsyLDM5XSw3NTpbMiwzOV0sNzY6WzIsMzldLDc3OlsyLDM5XSw3OTpbMiwzOV19LHs1MjpbMSw5NV19LHs1MjpbMiw3Nl0sNTk6WzIsNzZdLDY2OlsyLDc2XSw3NDpbMiw3Nl0sNzU6WzIsNzZdLDc2OlsyLDc2XSw3NzpbMiw3Nl19LHs1MjpbMiw3OF19LHs1OlsyLDEyXSwxMzpbMiwxMl0sMTQ6WzIsMTJdLDE3OlsyLDEyXSwyNzpbMiwxMl0sMzI6WzIsMTJdLDM3OlsyLDEyXSw0MjpbMiwxMl0sNDU6WzIsMTJdLDQ2OlsyLDEyXSw0OTpbMiwxMl0sNTM6WzIsMTJdfSx7MTg6OTYsNjY6WzEsMzBdLDcyOjIzLDczOjI0LDc0OlsxLDI1XSw3NTpbMSwyNl0sNzY6WzEsMjddLDc3OlsxLDI5XSw3ODoyOH0sezM2OjQ4LDM3OlsxLDUwXSw0MTo0OSw0MjpbMSw1MV0sNDM6OTgsNDQ6OTcsNDU6WzIsNjldfSx7MzE6WzIsNjNdLDM4Ojk5LDU5OlsyLDYzXSw2NjpbMiw2M10sNjk6WzIsNjNdLDc0OlsyLDYzXSw3NTpbMiw2M10sNzY6WzIsNjNdLDc3OlsyLDYzXX0sezQ1OlsyLDE3XX0sezU6WzIsMTNdLDEzOlsyLDEzXSwxNDpbMiwxM10sMTc6WzIsMTNdLDI3OlsyLDEzXSwzMjpbMiwxM10sMzc6WzIsMTNdLDQyOlsyLDEzXSw0NTpbMiwxM10sNDY6WzIsMTNdLDQ5OlsyLDEzXSw1MzpbMiwxM119LHszMTpbMSwxMDBdfSx7MzE6WzIsODBdLDU5OlsyLDgwXSw2NjpbMiw4MF0sNzQ6WzIsODBdLDc1OlsyLDgwXSw3NjpbMiw4MF0sNzc6WzIsODBdfSx7MzE6WzIsODJdfSx7MTg6NjMsNTc6MTAyLDU4OjY0LDU5OlsxLDM4XSw2MToxMDEsNjI6WzIsODVdLDYzOjEwMyw2NDo2NSw2NTo2Niw2NjpbMSw2N10sNzI6MjMsNzM6MjQsNzQ6WzEsMjVdLDc1OlsxLDI2XSw3NjpbMSwyN10sNzc6WzEsMjldLDc4OjI4fSx7MzA6MTA0LDMxOlsyLDU1XSw2ODoxMDUsNjk6WzEsMTA2XX0sezMxOlsyLDUyXSw1OTpbMiw1Ml0sNjY6WzIsNTJdLDY5OlsyLDUyXSw3NDpbMiw1Ml0sNzU6WzIsNTJdLDc2OlsyLDUyXSw3NzpbMiw1Ml19LHszMTpbMiw1NF0sNjk6WzIsNTRdfSx7MzE6WzIsNjFdLDM1OjEwNyw2ODoxMDgsNjk6WzEsMTA2XX0sezMxOlsyLDU4XSw1OTpbMiw1OF0sNjY6WzIsNThdLDY5OlsyLDU4XSw3NDpbMiw1OF0sNzU6WzIsNThdLDc2OlsyLDU4XSw3NzpbMiw1OF19LHszMTpbMiw2MF0sNjk6WzIsNjBdfSx7MjE6WzEsMTA5XX0sezIxOlsyLDQ0XSw1OTpbMiw0NF0sNjY6WzIsNDRdLDc0OlsyLDQ0XSw3NTpbMiw0NF0sNzY6WzIsNDRdLDc3OlsyLDQ0XX0sezIxOlsyLDQ2XX0sezU6WzIsMjFdLDEzOlsyLDIxXSwxNDpbMiwyMV0sMTc6WzIsMjFdLDI3OlsyLDIxXSwzMjpbMiwyMV0sMzc6WzIsMjFdLDQyOlsyLDIxXSw0NTpbMiwyMV0sNDY6WzIsMjFdLDQ5OlsyLDIxXSw1MzpbMiwyMV19LHsyMTpbMiw4OF0sMzE6WzIsODhdLDUyOlsyLDg4XSw2MjpbMiw4OF0sNjY6WzIsODhdLDY5OlsyLDg4XX0sezY3OlsxLDk0XX0sezE4OjYzLDU3OjExMCw1ODo2NCw1OTpbMSwzOF0sNjY6WzEsMzBdLDcyOjIzLDczOjI0LDc0OlsxLDI1XSw3NTpbMSwyNl0sNzY6WzEsMjddLDc3OlsxLDI5XSw3ODoyOH0sezU6WzIsMjJdLDEzOlsyLDIyXSwxNDpbMiwyMl0sMTc6WzIsMjJdLDI3OlsyLDIyXSwzMjpbMiwyMl0sMzc6WzIsMjJdLDQyOlsyLDIyXSw0NTpbMiwyMl0sNDY6WzIsMjJdLDQ5OlsyLDIyXSw1MzpbMiwyMl19LHszMTpbMSwxMTFdfSx7NDU6WzIsMThdfSx7NDU6WzIsNzBdfSx7MTg6NjMsMzE6WzIsNjVdLDM5OjExMiw1NzoxMTMsNTg6NjQsNTk6WzEsMzhdLDYzOjExNCw2NDo2NSw2NTo2Niw2NjpbMSw2N10sNjk6WzIsNjVdLDcyOjIzLDczOjI0LDc0OlsxLDI1XSw3NTpbMSwyNl0sNzY6WzEsMjddLDc3OlsxLDI5XSw3ODoyOH0sezU6WzIsMjNdLDEzOlsyLDIzXSwxNDpbMiwyM10sMTc6WzIsMjNdLDI3OlsyLDIzXSwzMjpbMiwyM10sMzc6WzIsMjNdLDQyOlsyLDIzXSw0NTpbMiwyM10sNDY6WzIsMjNdLDQ5OlsyLDIzXSw1MzpbMiwyM119LHs2MjpbMSwxMTVdfSx7NTk6WzIsODRdLDYyOlsyLDg0XSw2NjpbMiw4NF0sNzQ6WzIsODRdLDc1OlsyLDg0XSw3NjpbMiw4NF0sNzc6WzIsODRdfSx7NjI6WzIsODZdfSx7MzE6WzEsMTE2XX0sezMxOlsyLDU2XX0sezY2OlsxLDExOF0sNzA6MTE3fSx7MzE6WzEsMTE5XX0sezMxOlsyLDYyXX0sezE0OlsyLDExXX0sezIxOlsyLDI4XSwzMTpbMiwyOF0sNTI6WzIsMjhdLDYyOlsyLDI4XSw2NjpbMiwyOF0sNjk6WzIsMjhdfSx7NTpbMiwyMF0sMTM6WzIsMjBdLDE0OlsyLDIwXSwxNzpbMiwyMF0sMjc6WzIsMjBdLDMyOlsyLDIwXSwzNzpbMiwyMF0sNDI6WzIsMjBdLDQ1OlsyLDIwXSw0NjpbMiwyMF0sNDk6WzIsMjBdLDUzOlsyLDIwXX0sezMxOlsyLDY3XSw0MDoxMjAsNjg6MTIxLDY5OlsxLDEwNl19LHszMTpbMiw2NF0sNTk6WzIsNjRdLDY2OlsyLDY0XSw2OTpbMiw2NF0sNzQ6WzIsNjRdLDc1OlsyLDY0XSw3NjpbMiw2NF0sNzc6WzIsNjRdfSx7MzE6WzIsNjZdLDY5OlsyLDY2XX0sezIxOlsyLDI2XSwzMTpbMiwyNl0sNTI6WzIsMjZdLDU5OlsyLDI2XSw2MjpbMiwyNl0sNjY6WzIsMjZdLDY5OlsyLDI2XSw3NDpbMiwyNl0sNzU6WzIsMjZdLDc2OlsyLDI2XSw3NzpbMiwyNl19LHsxMzpbMiwxNF0sMTQ6WzIsMTRdLDE3OlsyLDE0XSwyNzpbMiwxNF0sMzI6WzIsMTRdLDM3OlsyLDE0XSw0MjpbMiwxNF0sNDU6WzIsMTRdLDQ2OlsyLDE0XSw0OTpbMiwxNF0sNTM6WzIsMTRdfSx7NjY6WzEsMTIzXSw3MTpbMSwxMjJdfSx7NjY6WzIsODldLDcxOlsyLDg5XX0sezEzOlsyLDE1XSwxNDpbMiwxNV0sMTc6WzIsMTVdLDI3OlsyLDE1XSwzMjpbMiwxNV0sNDI6WzIsMTVdLDQ1OlsyLDE1XSw0NjpbMiwxNV0sNDk6WzIsMTVdLDUzOlsyLDE1XX0sezMxOlsxLDEyNF19LHszMTpbMiw2OF19LHszMTpbMiwyOV19LHs2NjpbMiw5MF0sNzE6WzIsOTBdfSx7MTM6WzIsMTZdLDE0OlsyLDE2XSwxNzpbMiwxNl0sMjc6WzIsMTZdLDMyOlsyLDE2XSwzNzpbMiwxNl0sNDI6WzIsMTZdLDQ1OlsyLDE2XSw0NjpbMiwxNl0sNDk6WzIsMTZdLDUzOlsyLDE2XX1dLFxyXG4gIGRlZmF1bHRBY3Rpb25zOiB7NDpbMiwxXSw0NzpbMiw0OF0sNDk6WzIsMTldLDUzOlsyLDUwXSw2MjpbMiw3NF0sNzE6WzIsNzhdLDc2OlsyLDE3XSw4MDpbMiw4Ml0sOTA6WzIsNDZdLDk3OlsyLDE4XSw5ODpbMiw3MF0sMTAzOlsyLDg2XSwxMDU6WzIsNTZdLDEwODpbMiw2Ml0sMTA5OlsyLDExXSwxMjE6WzIsNjhdLDEyMjpbMiwyOV19LFxyXG4gIHBhcnNlRXJyb3I6IGZ1bmN0aW9uIHBhcnNlRXJyb3Ioc3RyLCBoYXNoKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihzdHIpO1xyXG4gIH0sXHJcbiAgcGFyc2U6IGZ1bmN0aW9uIHBhcnNlKGlucHV0KSB7XHJcbiAgICAgIHZhciBzZWxmID0gdGhpcywgc3RhY2sgPSBbMF0sIHZzdGFjayA9IFtudWxsXSwgbHN0YWNrID0gW10sIHRhYmxlID0gdGhpcy50YWJsZSwgeXl0ZXh0ID0gXCJcIiwgeXlsaW5lbm8gPSAwLCB5eWxlbmcgPSAwLCByZWNvdmVyaW5nID0gMCwgVEVSUk9SID0gMiwgRU9GID0gMTtcclxuICAgICAgdGhpcy5sZXhlci5zZXRJbnB1dChpbnB1dCk7XHJcbiAgICAgIHRoaXMubGV4ZXIueXkgPSB0aGlzLnl5O1xyXG4gICAgICB0aGlzLnl5LmxleGVyID0gdGhpcy5sZXhlcjtcclxuICAgICAgdGhpcy55eS5wYXJzZXIgPSB0aGlzO1xyXG4gICAgICBpZiAodHlwZW9mIHRoaXMubGV4ZXIueXlsbG9jID09IFwidW5kZWZpbmVkXCIpXHJcbiAgICAgICAgICB0aGlzLmxleGVyLnl5bGxvYyA9IHt9O1xyXG4gICAgICB2YXIgeXlsb2MgPSB0aGlzLmxleGVyLnl5bGxvYztcclxuICAgICAgbHN0YWNrLnB1c2goeXlsb2MpO1xyXG4gICAgICB2YXIgcmFuZ2VzID0gdGhpcy5sZXhlci5vcHRpb25zICYmIHRoaXMubGV4ZXIub3B0aW9ucy5yYW5nZXM7XHJcbiAgICAgIGlmICh0eXBlb2YgdGhpcy55eS5wYXJzZUVycm9yID09PSBcImZ1bmN0aW9uXCIpXHJcbiAgICAgICAgICB0aGlzLnBhcnNlRXJyb3IgPSB0aGlzLnl5LnBhcnNlRXJyb3I7XHJcbiAgICAgIGZ1bmN0aW9uIHBvcFN0YWNrKG4pIHtcclxuICAgICAgICAgIHN0YWNrLmxlbmd0aCA9IHN0YWNrLmxlbmd0aCAtIDIgKiBuO1xyXG4gICAgICAgICAgdnN0YWNrLmxlbmd0aCA9IHZzdGFjay5sZW5ndGggLSBuO1xyXG4gICAgICAgICAgbHN0YWNrLmxlbmd0aCA9IGxzdGFjay5sZW5ndGggLSBuO1xyXG4gICAgICB9XHJcbiAgICAgIGZ1bmN0aW9uIGxleCgpIHtcclxuICAgICAgICAgIHZhciB0b2tlbjtcclxuICAgICAgICAgIHRva2VuID0gc2VsZi5sZXhlci5sZXgoKSB8fCAxO1xyXG4gICAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgICAgICAgIHRva2VuID0gc2VsZi5zeW1ib2xzX1t0b2tlbl0gfHwgdG9rZW47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gdG9rZW47XHJcbiAgICAgIH1cclxuICAgICAgdmFyIHN5bWJvbCwgcHJlRXJyb3JTeW1ib2wsIHN0YXRlLCBhY3Rpb24sIGEsIHIsIHl5dmFsID0ge30sIHAsIGxlbiwgbmV3U3RhdGUsIGV4cGVjdGVkO1xyXG4gICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgc3RhdGUgPSBzdGFja1tzdGFjay5sZW5ndGggLSAxXTtcclxuICAgICAgICAgIGlmICh0aGlzLmRlZmF1bHRBY3Rpb25zW3N0YXRlXSkge1xyXG4gICAgICAgICAgICAgIGFjdGlvbiA9IHRoaXMuZGVmYXVsdEFjdGlvbnNbc3RhdGVdO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8IHR5cGVvZiBzeW1ib2wgPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgICAgICAgICAgICBzeW1ib2wgPSBsZXgoKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgYWN0aW9uID0gdGFibGVbc3RhdGVdICYmIHRhYmxlW3N0YXRlXVtzeW1ib2xdO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKHR5cGVvZiBhY3Rpb24gPT09IFwidW5kZWZpbmVkXCIgfHwgIWFjdGlvbi5sZW5ndGggfHwgIWFjdGlvblswXSkge1xyXG4gICAgICAgICAgICAgIHZhciBlcnJTdHIgPSBcIlwiO1xyXG4gICAgICAgICAgICAgIGlmICghcmVjb3ZlcmluZykge1xyXG4gICAgICAgICAgICAgICAgICBleHBlY3RlZCA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICBmb3IgKHAgaW4gdGFibGVbc3RhdGVdKVxyXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGVybWluYWxzX1twXSAmJiBwID4gMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkLnB1c2goXCInXCIgKyB0aGlzLnRlcm1pbmFsc19bcF0gKyBcIidcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmxleGVyLnNob3dQb3NpdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgZXJyU3RyID0gXCJQYXJzZSBlcnJvciBvbiBsaW5lIFwiICsgKHl5bGluZW5vICsgMSkgKyBcIjpcXG5cIiArIHRoaXMubGV4ZXIuc2hvd1Bvc2l0aW9uKCkgKyBcIlxcbkV4cGVjdGluZyBcIiArIGV4cGVjdGVkLmpvaW4oXCIsIFwiKSArIFwiLCBnb3QgJ1wiICsgKHRoaXMudGVybWluYWxzX1tzeW1ib2xdIHx8IHN5bWJvbCkgKyBcIidcIjtcclxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGVyclN0ciA9IFwiUGFyc2UgZXJyb3Igb24gbGluZSBcIiArICh5eWxpbmVubyArIDEpICsgXCI6IFVuZXhwZWN0ZWQgXCIgKyAoc3ltYm9sID09IDE/XCJlbmQgb2YgaW5wdXRcIjpcIidcIiArICh0aGlzLnRlcm1pbmFsc19bc3ltYm9sXSB8fCBzeW1ib2wpICsgXCInXCIpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIHRoaXMucGFyc2VFcnJvcihlcnJTdHIsIHt0ZXh0OiB0aGlzLmxleGVyLm1hdGNoLCB0b2tlbjogdGhpcy50ZXJtaW5hbHNfW3N5bWJvbF0gfHwgc3ltYm9sLCBsaW5lOiB0aGlzLmxleGVyLnl5bGluZW5vLCBsb2M6IHl5bG9jLCBleHBlY3RlZDogZXhwZWN0ZWR9KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoYWN0aW9uWzBdIGluc3RhbmNlb2YgQXJyYXkgJiYgYWN0aW9uLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQYXJzZSBFcnJvcjogbXVsdGlwbGUgYWN0aW9ucyBwb3NzaWJsZSBhdCBzdGF0ZTogXCIgKyBzdGF0ZSArIFwiLCB0b2tlbjogXCIgKyBzeW1ib2wpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgc3dpdGNoIChhY3Rpb25bMF0pIHtcclxuICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICBzdGFjay5wdXNoKHN5bWJvbCk7XHJcbiAgICAgICAgICAgICAgdnN0YWNrLnB1c2godGhpcy5sZXhlci55eXRleHQpO1xyXG4gICAgICAgICAgICAgIGxzdGFjay5wdXNoKHRoaXMubGV4ZXIueXlsbG9jKTtcclxuICAgICAgICAgICAgICBzdGFjay5wdXNoKGFjdGlvblsxXSk7XHJcbiAgICAgICAgICAgICAgc3ltYm9sID0gbnVsbDtcclxuICAgICAgICAgICAgICBpZiAoIXByZUVycm9yU3ltYm9sKSB7XHJcbiAgICAgICAgICAgICAgICAgIHl5bGVuZyA9IHRoaXMubGV4ZXIueXlsZW5nO1xyXG4gICAgICAgICAgICAgICAgICB5eXRleHQgPSB0aGlzLmxleGVyLnl5dGV4dDtcclxuICAgICAgICAgICAgICAgICAgeXlsaW5lbm8gPSB0aGlzLmxleGVyLnl5bGluZW5vO1xyXG4gICAgICAgICAgICAgICAgICB5eWxvYyA9IHRoaXMubGV4ZXIueXlsbG9jO1xyXG4gICAgICAgICAgICAgICAgICBpZiAocmVjb3ZlcmluZyA+IDApXHJcbiAgICAgICAgICAgICAgICAgICAgICByZWNvdmVyaW5nLS07XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgc3ltYm9sID0gcHJlRXJyb3JTeW1ib2w7XHJcbiAgICAgICAgICAgICAgICAgIHByZUVycm9yU3ltYm9sID0gbnVsbDtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgbGVuID0gdGhpcy5wcm9kdWN0aW9uc19bYWN0aW9uWzFdXVsxXTtcclxuICAgICAgICAgICAgICB5eXZhbC4kID0gdnN0YWNrW3ZzdGFjay5sZW5ndGggLSBsZW5dO1xyXG4gICAgICAgICAgICAgIHl5dmFsLl8kID0ge2ZpcnN0X2xpbmU6IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gKGxlbiB8fCAxKV0uZmlyc3RfbGluZSwgbGFzdF9saW5lOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIDFdLmxhc3RfbGluZSwgZmlyc3RfY29sdW1uOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIChsZW4gfHwgMSldLmZpcnN0X2NvbHVtbiwgbGFzdF9jb2x1bW46IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gMV0ubGFzdF9jb2x1bW59O1xyXG4gICAgICAgICAgICAgIGlmIChyYW5nZXMpIHtcclxuICAgICAgICAgICAgICAgICAgeXl2YWwuXyQucmFuZ2UgPSBbbHN0YWNrW2xzdGFjay5sZW5ndGggLSAobGVuIHx8IDEpXS5yYW5nZVswXSwgbHN0YWNrW2xzdGFjay5sZW5ndGggLSAxXS5yYW5nZVsxXV07XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIHIgPSB0aGlzLnBlcmZvcm1BY3Rpb24uY2FsbCh5eXZhbCwgeXl0ZXh0LCB5eWxlbmcsIHl5bGluZW5vLCB0aGlzLnl5LCBhY3Rpb25bMV0sIHZzdGFjaywgbHN0YWNrKTtcclxuICAgICAgICAgICAgICBpZiAodHlwZW9mIHIgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHI7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGlmIChsZW4pIHtcclxuICAgICAgICAgICAgICAgICAgc3RhY2sgPSBzdGFjay5zbGljZSgwLCAtMSAqIGxlbiAqIDIpO1xyXG4gICAgICAgICAgICAgICAgICB2c3RhY2sgPSB2c3RhY2suc2xpY2UoMCwgLTEgKiBsZW4pO1xyXG4gICAgICAgICAgICAgICAgICBsc3RhY2sgPSBsc3RhY2suc2xpY2UoMCwgLTEgKiBsZW4pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBzdGFjay5wdXNoKHRoaXMucHJvZHVjdGlvbnNfW2FjdGlvblsxXV1bMF0pO1xyXG4gICAgICAgICAgICAgIHZzdGFjay5wdXNoKHl5dmFsLiQpO1xyXG4gICAgICAgICAgICAgIGxzdGFjay5wdXNoKHl5dmFsLl8kKTtcclxuICAgICAgICAgICAgICBuZXdTdGF0ZSA9IHRhYmxlW3N0YWNrW3N0YWNrLmxlbmd0aCAtIDJdXVtzdGFja1tzdGFjay5sZW5ndGggLSAxXV07XHJcbiAgICAgICAgICAgICAgc3RhY2sucHVzaChuZXdTdGF0ZSk7XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG4gIH07XHJcbiAgLyogSmlzb24gZ2VuZXJhdGVkIGxleGVyICovXHJcbiAgdmFyIGxleGVyID0gKGZ1bmN0aW9uKCl7XHJcbiAgdmFyIGxleGVyID0gKHtFT0Y6MSxcclxuICBwYXJzZUVycm9yOmZ1bmN0aW9uIHBhcnNlRXJyb3Ioc3RyLCBoYXNoKSB7XHJcbiAgICAgICAgICBpZiAodGhpcy55eS5wYXJzZXIpIHtcclxuICAgICAgICAgICAgICB0aGlzLnl5LnBhcnNlci5wYXJzZUVycm9yKHN0ciwgaGFzaCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihzdHIpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gIHNldElucHV0OmZ1bmN0aW9uIChpbnB1dCkge1xyXG4gICAgICAgICAgdGhpcy5faW5wdXQgPSBpbnB1dDtcclxuICAgICAgICAgIHRoaXMuX21vcmUgPSB0aGlzLl9sZXNzID0gdGhpcy5kb25lID0gZmFsc2U7XHJcbiAgICAgICAgICB0aGlzLnl5bGluZW5vID0gdGhpcy55eWxlbmcgPSAwO1xyXG4gICAgICAgICAgdGhpcy55eXRleHQgPSB0aGlzLm1hdGNoZWQgPSB0aGlzLm1hdGNoID0gJyc7XHJcbiAgICAgICAgICB0aGlzLmNvbmRpdGlvblN0YWNrID0gWydJTklUSUFMJ107XHJcbiAgICAgICAgICB0aGlzLnl5bGxvYyA9IHtmaXJzdF9saW5lOjEsZmlyc3RfY29sdW1uOjAsbGFzdF9saW5lOjEsbGFzdF9jb2x1bW46MH07XHJcbiAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykgdGhpcy55eWxsb2MucmFuZ2UgPSBbMCwwXTtcclxuICAgICAgICAgIHRoaXMub2Zmc2V0ID0gMDtcclxuICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICB9LFxyXG4gIGlucHV0OmZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBjaCA9IHRoaXMuX2lucHV0WzBdO1xyXG4gICAgICAgICAgdGhpcy55eXRleHQgKz0gY2g7XHJcbiAgICAgICAgICB0aGlzLnl5bGVuZysrO1xyXG4gICAgICAgICAgdGhpcy5vZmZzZXQrKztcclxuICAgICAgICAgIHRoaXMubWF0Y2ggKz0gY2g7XHJcbiAgICAgICAgICB0aGlzLm1hdGNoZWQgKz0gY2g7XHJcbiAgICAgICAgICB2YXIgbGluZXMgPSBjaC5tYXRjaCgvKD86XFxyXFxuP3xcXG4pLiovZyk7XHJcbiAgICAgICAgICBpZiAobGluZXMpIHtcclxuICAgICAgICAgICAgICB0aGlzLnl5bGluZW5vKys7XHJcbiAgICAgICAgICAgICAgdGhpcy55eWxsb2MubGFzdF9saW5lKys7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHRoaXMueXlsbG9jLmxhc3RfY29sdW1uKys7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykgdGhpcy55eWxsb2MucmFuZ2VbMV0rKztcclxuXHJcbiAgICAgICAgICB0aGlzLl9pbnB1dCA9IHRoaXMuX2lucHV0LnNsaWNlKDEpO1xyXG4gICAgICAgICAgcmV0dXJuIGNoO1xyXG4gICAgICB9LFxyXG4gIHVucHV0OmZ1bmN0aW9uIChjaCkge1xyXG4gICAgICAgICAgdmFyIGxlbiA9IGNoLmxlbmd0aDtcclxuICAgICAgICAgIHZhciBsaW5lcyA9IGNoLnNwbGl0KC8oPzpcXHJcXG4/fFxcbikvZyk7XHJcblxyXG4gICAgICAgICAgdGhpcy5faW5wdXQgPSBjaCArIHRoaXMuX2lucHV0O1xyXG4gICAgICAgICAgdGhpcy55eXRleHQgPSB0aGlzLnl5dGV4dC5zdWJzdHIoMCwgdGhpcy55eXRleHQubGVuZ3RoLWxlbi0xKTtcclxuICAgICAgICAgIC8vdGhpcy55eWxlbmcgLT0gbGVuO1xyXG4gICAgICAgICAgdGhpcy5vZmZzZXQgLT0gbGVuO1xyXG4gICAgICAgICAgdmFyIG9sZExpbmVzID0gdGhpcy5tYXRjaC5zcGxpdCgvKD86XFxyXFxuP3xcXG4pL2cpO1xyXG4gICAgICAgICAgdGhpcy5tYXRjaCA9IHRoaXMubWF0Y2guc3Vic3RyKDAsIHRoaXMubWF0Y2gubGVuZ3RoLTEpO1xyXG4gICAgICAgICAgdGhpcy5tYXRjaGVkID0gdGhpcy5tYXRjaGVkLnN1YnN0cigwLCB0aGlzLm1hdGNoZWQubGVuZ3RoLTEpO1xyXG5cclxuICAgICAgICAgIGlmIChsaW5lcy5sZW5ndGgtMSkgdGhpcy55eWxpbmVubyAtPSBsaW5lcy5sZW5ndGgtMTtcclxuICAgICAgICAgIHZhciByID0gdGhpcy55eWxsb2MucmFuZ2U7XHJcblxyXG4gICAgICAgICAgdGhpcy55eWxsb2MgPSB7Zmlyc3RfbGluZTogdGhpcy55eWxsb2MuZmlyc3RfbGluZSxcclxuICAgICAgICAgICAgbGFzdF9saW5lOiB0aGlzLnl5bGluZW5vKzEsXHJcbiAgICAgICAgICAgIGZpcnN0X2NvbHVtbjogdGhpcy55eWxsb2MuZmlyc3RfY29sdW1uLFxyXG4gICAgICAgICAgICBsYXN0X2NvbHVtbjogbGluZXMgP1xyXG4gICAgICAgICAgICAgICAgKGxpbmVzLmxlbmd0aCA9PT0gb2xkTGluZXMubGVuZ3RoID8gdGhpcy55eWxsb2MuZmlyc3RfY29sdW1uIDogMCkgKyBvbGRMaW5lc1tvbGRMaW5lcy5sZW5ndGggLSBsaW5lcy5sZW5ndGhdLmxlbmd0aCAtIGxpbmVzWzBdLmxlbmd0aDpcclxuICAgICAgICAgICAgICAgIHRoaXMueXlsbG9jLmZpcnN0X2NvbHVtbiAtIGxlblxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB7XHJcbiAgICAgICAgICAgICAgdGhpcy55eWxsb2MucmFuZ2UgPSBbclswXSwgclswXSArIHRoaXMueXlsZW5nIC0gbGVuXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICB9LFxyXG4gIG1vcmU6ZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdGhpcy5fbW9yZSA9IHRydWU7XHJcbiAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgfSxcclxuICBsZXNzOmZ1bmN0aW9uIChuKSB7XHJcbiAgICAgICAgICB0aGlzLnVucHV0KHRoaXMubWF0Y2guc2xpY2UobikpO1xyXG4gICAgICB9LFxyXG4gIHBhc3RJbnB1dDpmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgcGFzdCA9IHRoaXMubWF0Y2hlZC5zdWJzdHIoMCwgdGhpcy5tYXRjaGVkLmxlbmd0aCAtIHRoaXMubWF0Y2gubGVuZ3RoKTtcclxuICAgICAgICAgIHJldHVybiAocGFzdC5sZW5ndGggPiAyMCA/ICcuLi4nOicnKSArIHBhc3Quc3Vic3RyKC0yMCkucmVwbGFjZSgvXFxuL2csIFwiXCIpO1xyXG4gICAgICB9LFxyXG4gIHVwY29taW5nSW5wdXQ6ZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIG5leHQgPSB0aGlzLm1hdGNoO1xyXG4gICAgICAgICAgaWYgKG5leHQubGVuZ3RoIDwgMjApIHtcclxuICAgICAgICAgICAgICBuZXh0ICs9IHRoaXMuX2lucHV0LnN1YnN0cigwLCAyMC1uZXh0Lmxlbmd0aCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gKG5leHQuc3Vic3RyKDAsMjApKyhuZXh0Lmxlbmd0aCA+IDIwID8gJy4uLic6JycpKS5yZXBsYWNlKC9cXG4vZywgXCJcIik7XHJcbiAgICAgIH0sXHJcbiAgc2hvd1Bvc2l0aW9uOmZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBwcmUgPSB0aGlzLnBhc3RJbnB1dCgpO1xyXG4gICAgICAgICAgdmFyIGMgPSBuZXcgQXJyYXkocHJlLmxlbmd0aCArIDEpLmpvaW4oXCItXCIpO1xyXG4gICAgICAgICAgcmV0dXJuIHByZSArIHRoaXMudXBjb21pbmdJbnB1dCgpICsgXCJcXG5cIiArIGMrXCJeXCI7XHJcbiAgICAgIH0sXHJcbiAgbmV4dDpmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBpZiAodGhpcy5kb25lKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuRU9GO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKCF0aGlzLl9pbnB1dCkgdGhpcy5kb25lID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICB2YXIgdG9rZW4sXHJcbiAgICAgICAgICAgICAgbWF0Y2gsXHJcbiAgICAgICAgICAgICAgdGVtcE1hdGNoLFxyXG4gICAgICAgICAgICAgIGluZGV4LFxyXG4gICAgICAgICAgICAgIGNvbCxcclxuICAgICAgICAgICAgICBsaW5lcztcclxuICAgICAgICAgIGlmICghdGhpcy5fbW9yZSkge1xyXG4gICAgICAgICAgICAgIHRoaXMueXl0ZXh0ID0gJyc7XHJcbiAgICAgICAgICAgICAgdGhpcy5tYXRjaCA9ICcnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgdmFyIHJ1bGVzID0gdGhpcy5fY3VycmVudFJ1bGVzKCk7XHJcbiAgICAgICAgICBmb3IgKHZhciBpPTA7aSA8IHJ1bGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgdGVtcE1hdGNoID0gdGhpcy5faW5wdXQubWF0Y2godGhpcy5ydWxlc1tydWxlc1tpXV0pO1xyXG4gICAgICAgICAgICAgIGlmICh0ZW1wTWF0Y2ggJiYgKCFtYXRjaCB8fCB0ZW1wTWF0Y2hbMF0ubGVuZ3RoID4gbWF0Y2hbMF0ubGVuZ3RoKSkge1xyXG4gICAgICAgICAgICAgICAgICBtYXRjaCA9IHRlbXBNYXRjaDtcclxuICAgICAgICAgICAgICAgICAgaW5kZXggPSBpO1xyXG4gICAgICAgICAgICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5mbGV4KSBicmVhaztcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAobWF0Y2gpIHtcclxuICAgICAgICAgICAgICBsaW5lcyA9IG1hdGNoWzBdLm1hdGNoKC8oPzpcXHJcXG4/fFxcbikuKi9nKTtcclxuICAgICAgICAgICAgICBpZiAobGluZXMpIHRoaXMueXlsaW5lbm8gKz0gbGluZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICAgIHRoaXMueXlsbG9jID0ge2ZpcnN0X2xpbmU6IHRoaXMueXlsbG9jLmxhc3RfbGluZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0X2xpbmU6IHRoaXMueXlsaW5lbm8rMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdF9jb2x1bW46IHRoaXMueXlsbG9jLmxhc3RfY29sdW1uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RfY29sdW1uOiBsaW5lcyA/IGxpbmVzW2xpbmVzLmxlbmd0aC0xXS5sZW5ndGgtbGluZXNbbGluZXMubGVuZ3RoLTFdLm1hdGNoKC9cXHI/XFxuPy8pWzBdLmxlbmd0aCA6IHRoaXMueXlsbG9jLmxhc3RfY29sdW1uICsgbWF0Y2hbMF0ubGVuZ3RofTtcclxuICAgICAgICAgICAgICB0aGlzLnl5dGV4dCArPSBtYXRjaFswXTtcclxuICAgICAgICAgICAgICB0aGlzLm1hdGNoICs9IG1hdGNoWzBdO1xyXG4gICAgICAgICAgICAgIHRoaXMubWF0Y2hlcyA9IG1hdGNoO1xyXG4gICAgICAgICAgICAgIHRoaXMueXlsZW5nID0gdGhpcy55eXRleHQubGVuZ3RoO1xyXG4gICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB7XHJcbiAgICAgICAgICAgICAgICAgIHRoaXMueXlsbG9jLnJhbmdlID0gW3RoaXMub2Zmc2V0LCB0aGlzLm9mZnNldCArPSB0aGlzLnl5bGVuZ107XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIHRoaXMuX21vcmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICB0aGlzLl9pbnB1dCA9IHRoaXMuX2lucHV0LnNsaWNlKG1hdGNoWzBdLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgdGhpcy5tYXRjaGVkICs9IG1hdGNoWzBdO1xyXG4gICAgICAgICAgICAgIHRva2VuID0gdGhpcy5wZXJmb3JtQWN0aW9uLmNhbGwodGhpcywgdGhpcy55eSwgdGhpcywgcnVsZXNbaW5kZXhdLHRoaXMuY29uZGl0aW9uU3RhY2tbdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGgtMV0pO1xyXG4gICAgICAgICAgICAgIGlmICh0aGlzLmRvbmUgJiYgdGhpcy5faW5wdXQpIHRoaXMuZG9uZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgIGlmICh0b2tlbikgcmV0dXJuIHRva2VuO1xyXG4gICAgICAgICAgICAgIGVsc2UgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKHRoaXMuX2lucHV0ID09PSBcIlwiKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuRU9GO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJzZUVycm9yKCdMZXhpY2FsIGVycm9yIG9uIGxpbmUgJysodGhpcy55eWxpbmVubysxKSsnLiBVbnJlY29nbml6ZWQgdGV4dC5cXG4nK3RoaXMuc2hvd1Bvc2l0aW9uKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICB7dGV4dDogXCJcIiwgdG9rZW46IG51bGwsIGxpbmU6IHRoaXMueXlsaW5lbm99KTtcclxuICAgICAgICAgIH1cclxuICAgICAgfSxcclxuICBsZXg6ZnVuY3Rpb24gbGV4KCkge1xyXG4gICAgICAgICAgdmFyIHIgPSB0aGlzLm5leHQoKTtcclxuICAgICAgICAgIGlmICh0eXBlb2YgciAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gcjtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubGV4KCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgYmVnaW46ZnVuY3Rpb24gYmVnaW4oY29uZGl0aW9uKSB7XHJcbiAgICAgICAgICB0aGlzLmNvbmRpdGlvblN0YWNrLnB1c2goY29uZGl0aW9uKTtcclxuICAgICAgfSxcclxuICBwb3BTdGF0ZTpmdW5jdGlvbiBwb3BTdGF0ZSgpIHtcclxuICAgICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvblN0YWNrLnBvcCgpO1xyXG4gICAgICB9LFxyXG4gIF9jdXJyZW50UnVsZXM6ZnVuY3Rpb24gX2N1cnJlbnRSdWxlcygpIHtcclxuICAgICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvbnNbdGhpcy5jb25kaXRpb25TdGFja1t0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aC0xXV0ucnVsZXM7XHJcbiAgICAgIH0sXHJcbiAgdG9wU3RhdGU6ZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuY29uZGl0aW9uU3RhY2tbdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGgtMl07XHJcbiAgICAgIH0sXHJcbiAgcHVzaFN0YXRlOmZ1bmN0aW9uIGJlZ2luKGNvbmRpdGlvbikge1xyXG4gICAgICAgICAgdGhpcy5iZWdpbihjb25kaXRpb24pO1xyXG4gICAgICB9fSk7XHJcbiAgbGV4ZXIub3B0aW9ucyA9IHt9O1xyXG4gIGxleGVyLnBlcmZvcm1BY3Rpb24gPSBmdW5jdGlvbiBhbm9ueW1vdXMoeXkseXlfLCRhdm9pZGluZ19uYW1lX2NvbGxpc2lvbnMsWVlfU1RBUlQpIHtcclxuXHJcblxyXG4gIGZ1bmN0aW9uIHN0cmlwKHN0YXJ0LCBlbmQpIHtcclxuICAgIHJldHVybiB5eV8ueXl0ZXh0ID0geXlfLnl5dGV4dC5zdWJzdHIoc3RhcnQsIHl5Xy55eWxlbmctZW5kKTtcclxuICB9XHJcblxyXG5cclxuICB2YXIgWVlTVEFURT1ZWV9TVEFSVFxyXG4gIHN3aXRjaCgkYXZvaWRpbmdfbmFtZV9jb2xsaXNpb25zKSB7XHJcbiAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoeXlfLnl5dGV4dC5zbGljZSgtMikgPT09IFwiXFxcXFxcXFxcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpcCgwLDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luKFwibXVcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYoeXlfLnl5dGV4dC5zbGljZSgtMSkgPT09IFwiXFxcXFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmlwKDAsMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYmVnaW4oXCJlbXVcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luKFwibXVcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih5eV8ueXl0ZXh0KSByZXR1cm4gMTQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAxOnJldHVybiAxNDtcclxuICBicmVhaztcclxuICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcFN0YXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAzOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5eV8ueXl0ZXh0ID0geXlfLnl5dGV4dC5zdWJzdHIoNSwgeXlfLnl5bGVuZy05KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3BTdGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTY7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgYnJlYWs7XHJcbiAgY2FzZSA0OiByZXR1cm4gMTQ7IFxyXG4gIGJyZWFrO1xyXG4gIGNhc2UgNTpcclxuICAgIHRoaXMucG9wU3RhdGUoKTtcclxuICAgIHJldHVybiAxMztcclxuXHJcbiAgYnJlYWs7XHJcbiAgY2FzZSA2OnJldHVybiA1OTtcclxuICBicmVhaztcclxuICBjYXNlIDc6cmV0dXJuIDYyO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgODogcmV0dXJuIDE3OyBcclxuICBicmVhaztcclxuICBjYXNlIDk6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucG9wU3RhdGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5iZWdpbigncmF3Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAyMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICBicmVhaztcclxuICBjYXNlIDEwOnJldHVybiA1MztcclxuICBicmVhaztcclxuICBjYXNlIDExOnJldHVybiAyNztcclxuICBicmVhaztcclxuICBjYXNlIDEyOnJldHVybiA0NTtcclxuICBicmVhaztcclxuICBjYXNlIDEzOnRoaXMucG9wU3RhdGUoKTsgcmV0dXJuIDQyO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMTQ6dGhpcy5wb3BTdGF0ZSgpOyByZXR1cm4gNDI7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAxNTpyZXR1cm4gMzI7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAxNjpyZXR1cm4gMzc7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAxNzpyZXR1cm4gNDk7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAxODpyZXR1cm4gNDY7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAxOTpcclxuICAgIHRoaXMudW5wdXQoeXlfLnl5dGV4dCk7XHJcbiAgICB0aGlzLnBvcFN0YXRlKCk7XHJcbiAgICB0aGlzLmJlZ2luKCdjb20nKTtcclxuXHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAyMDpcclxuICAgIHRoaXMucG9wU3RhdGUoKTtcclxuICAgIHJldHVybiAxMztcclxuXHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAyMTpyZXR1cm4gNDY7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAyMjpyZXR1cm4gNjc7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAyMzpyZXR1cm4gNjY7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAyNDpyZXR1cm4gNjY7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAyNTpyZXR1cm4gNzk7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAyNjovLyBpZ25vcmUgd2hpdGVzcGFjZVxyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMjc6dGhpcy5wb3BTdGF0ZSgpOyByZXR1cm4gNTI7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAyODp0aGlzLnBvcFN0YXRlKCk7IHJldHVybiAzMTtcclxuICBicmVhaztcclxuICBjYXNlIDI5Onl5Xy55eXRleHQgPSBzdHJpcCgxLDIpLnJlcGxhY2UoL1xcXFxcIi9nLCdcIicpOyByZXR1cm4gNzQ7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSAzMDp5eV8ueXl0ZXh0ID0gc3RyaXAoMSwyKS5yZXBsYWNlKC9cXFxcJy9nLFwiJ1wiKTsgcmV0dXJuIDc0O1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMzE6cmV0dXJuIDc3O1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMzI6cmV0dXJuIDc2O1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMzM6cmV0dXJuIDc2O1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMzQ6cmV0dXJuIDc1O1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMzU6cmV0dXJuIDY5O1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMzY6cmV0dXJuIDcxO1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMzc6cmV0dXJuIDY2O1xyXG4gIGJyZWFrO1xyXG4gIGNhc2UgMzg6eXlfLnl5dGV4dCA9IHN0cmlwKDEsMik7IHJldHVybiA2NjtcclxuICBicmVhaztcclxuICBjYXNlIDM5OnJldHVybiAnSU5WQUxJRCc7XHJcbiAgYnJlYWs7XHJcbiAgY2FzZSA0MDpyZXR1cm4gNTtcclxuICBicmVhaztcclxuICB9XHJcbiAgfTtcclxuICBsZXhlci5ydWxlcyA9IFsvXig/OlteXFx4MDBdKj8oPz0oXFx7XFx7KSkpLywvXig/OlteXFx4MDBdKykvLC9eKD86W15cXHgwMF17Mix9Pyg/PShcXHtcXHt8XFxcXFxce1xce3xcXFxcXFxcXFxce1xce3wkKSkpLywvXig/Olxce1xce1xce1xce1xcL1teXFxzIVwiIyUtLFxcLlxcLzstPkBcXFstXFxeYFxcey1+XSsoPz1bPX1cXHNcXC8uXSlcXH1cXH1cXH1cXH0pLywvXig/OlteXFx4MDBdKj8oPz0oXFx7XFx7XFx7XFx7XFwvKSkpLywvXig/OltcXHNcXFNdKj8tLSh+KT9cXH1cXH0pLywvXig/OlxcKCkvLC9eKD86XFwpKS8sL14oPzpcXHtcXHtcXHtcXHspLywvXig/OlxcfVxcfVxcfVxcfSkvLC9eKD86XFx7XFx7KH4pPz4pLywvXig/Olxce1xceyh+KT8jKS8sL14oPzpcXHtcXHsofik/XFwvKS8sL14oPzpcXHtcXHsofik/XFxeXFxzKih+KT9cXH1cXH0pLywvXig/Olxce1xceyh+KT9cXHMqZWxzZVxccyoofik/XFx9XFx9KS8sL14oPzpcXHtcXHsofik/XFxeKS8sL14oPzpcXHtcXHsofik/XFxzKmVsc2VcXGIpLywvXig/Olxce1xceyh+KT9cXHspLywvXig/Olxce1xceyh+KT8mKS8sL14oPzpcXHtcXHsofik/IS0tKS8sL14oPzpcXHtcXHsofik/IVtcXHNcXFNdKj9cXH1cXH0pLywvXig/Olxce1xceyh+KT8pLywvXig/Oj0pLywvXig/OlxcLlxcLikvLC9eKD86XFwuKD89KFs9fn1cXHNcXC8uKXxdKSkpLywvXig/OltcXC8uXSkvLC9eKD86XFxzKykvLC9eKD86XFx9KH4pP1xcfVxcfSkvLC9eKD86KH4pP1xcfVxcfSkvLC9eKD86XCIoXFxcXFtcIl18W15cIl0pKlwiKS8sL14oPzonKFxcXFxbJ118W14nXSkqJykvLC9eKD86QCkvLC9eKD86dHJ1ZSg/PShbfn1cXHMpXSkpKS8sL14oPzpmYWxzZSg/PShbfn1cXHMpXSkpKS8sL14oPzotP1swLTldKyg/OlxcLlswLTldKyk/KD89KFt+fVxccyldKSkpLywvXig/OmFzXFxzK1xcfCkvLC9eKD86XFx8KS8sL14oPzooW15cXHMhXCIjJS0sXFwuXFwvOy0+QFxcWy1cXF5gXFx7LX5dKyg/PShbPX59XFxzXFwvLil8XSkpKSkvLC9eKD86XFxbW15cXF1dKlxcXSkvLC9eKD86LikvLC9eKD86JCkvXTtcclxuICBsZXhlci5jb25kaXRpb25zID0ge1wibXVcIjp7XCJydWxlc1wiOls2LDcsOCw5LDEwLDExLDEyLDEzLDE0LDE1LDE2LDE3LDE4LDE5LDIwLDIxLDIyLDIzLDI0LDI1LDI2LDI3LDI4LDI5LDMwLDMxLDMyLDMzLDM0LDM1LDM2LDM3LDM4LDM5LDQwXSxcImluY2x1c2l2ZVwiOmZhbHNlfSxcImVtdVwiOntcInJ1bGVzXCI6WzJdLFwiaW5jbHVzaXZlXCI6ZmFsc2V9LFwiY29tXCI6e1wicnVsZXNcIjpbNV0sXCJpbmNsdXNpdmVcIjpmYWxzZX0sXCJyYXdcIjp7XCJydWxlc1wiOlszLDRdLFwiaW5jbHVzaXZlXCI6ZmFsc2V9LFwiSU5JVElBTFwiOntcInJ1bGVzXCI6WzAsMSw0MF0sXCJpbmNsdXNpdmVcIjp0cnVlfX07XHJcbiAgcmV0dXJuIGxleGVyO30pKClcclxuICBwYXJzZXIubGV4ZXIgPSBsZXhlcjtcclxuICBmdW5jdGlvbiBQYXJzZXIgKCkgeyB0aGlzLnl5ID0ge307IH1QYXJzZXIucHJvdG90eXBlID0gcGFyc2VyO3BhcnNlci5QYXJzZXIgPSBQYXJzZXI7XHJcbiAgcmV0dXJuIG5ldyBQYXJzZXI7XHJcbiAgfSkoKTtfX2V4cG9ydHNfXyA9IGhhbmRsZWJhcnM7XHJcbiAgLyoganNoaW50IGlnbm9yZTplbmQgKi9cclxuICByZXR1cm4gX19leHBvcnRzX187XHJcbn0pKCk7XHJcblxyXG4vLyBoYW5kbGViYXJzL2NvbXBpbGVyL3Zpc2l0b3IuanNcclxudmFyIF9fbW9kdWxlMTFfXyA9IChmdW5jdGlvbihfX2RlcGVuZGVuY3kxX18sIF9fZGVwZW5kZW5jeTJfXykge1xyXG4gIFwidXNlIHN0cmljdFwiO1xyXG4gIHZhciBfX2V4cG9ydHNfXztcclxuICB2YXIgRXhjZXB0aW9uID0gX19kZXBlbmRlbmN5MV9fO1xyXG4gIHZhciBBU1QgPSBfX2RlcGVuZGVuY3kyX187XHJcblxyXG4gIGZ1bmN0aW9uIFZpc2l0b3IoKSB7XHJcbiAgICB0aGlzLnBhcmVudHMgPSBbXTtcclxuICB9XHJcblxyXG4gIFZpc2l0b3IucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IFZpc2l0b3IsXHJcbiAgICBtdXRhdGluZzogZmFsc2UsXHJcblxyXG4gICAgLy8gVmlzaXRzIGEgZ2l2ZW4gdmFsdWUuIElmIG11dGF0aW5nLCB3aWxsIHJlcGxhY2UgdGhlIHZhbHVlIGlmIG5lY2Vzc2FyeS5cclxuICAgIGFjY2VwdEtleTogZnVuY3Rpb24obm9kZSwgbmFtZSkge1xyXG4gICAgICB2YXIgdmFsdWUgPSB0aGlzLmFjY2VwdChub2RlW25hbWVdKTtcclxuICAgICAgaWYgKHRoaXMubXV0YXRpbmcpIHtcclxuICAgICAgICAvLyBIYWNreSBzYW5pdHkgY2hlY2s6XHJcbiAgICAgICAgaWYgKHZhbHVlICYmICghdmFsdWUudHlwZSB8fCAhQVNUW3ZhbHVlLnR5cGVdKSkge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignVW5leHBlY3RlZCBub2RlIHR5cGUgXCInICsgdmFsdWUudHlwZSArICdcIiBmb3VuZCB3aGVuIGFjY2VwdGluZyAnICsgbmFtZSArICcgb24gJyArIG5vZGUudHlwZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIG5vZGVbbmFtZV0gPSB2YWx1ZTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBQZXJmb3JtcyBhbiBhY2NlcHQgb3BlcmF0aW9uIHdpdGggYWRkZWQgc2FuaXR5IGNoZWNrIHRvIGVuc3VyZVxyXG4gICAgLy8gcmVxdWlyZWQga2V5cyBhcmUgbm90IHJlbW92ZWQuXHJcbiAgICBhY2NlcHRSZXF1aXJlZDogZnVuY3Rpb24obm9kZSwgbmFtZSkge1xyXG4gICAgICB0aGlzLmFjY2VwdEtleShub2RlLCBuYW1lKTtcclxuXHJcbiAgICAgIGlmICghbm9kZVtuYW1lXSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFeGNlcHRpb24obm9kZS50eXBlICsgJyByZXF1aXJlcyAnICsgbmFtZSk7XHJcbiAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLy8gVHJhdmVyc2VzIGEgZ2l2ZW4gYXJyYXkuIElmIG11dGF0aW5nLCBlbXB0eSByZXNwbnNlcyB3aWxsIGJlIHJlbW92ZWRcclxuICAgIC8vIGZvciBjaGlsZCBlbGVtZW50cy5cclxuICAgIGFjY2VwdEFycmF5OiBmdW5jdGlvbihhcnJheSkge1xyXG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGFycmF5Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgICAgIHRoaXMuYWNjZXB0S2V5KGFycmF5LCBpKTtcclxuXHJcbiAgICAgICAgaWYgKCFhcnJheVtpXSkge1xyXG4gICAgICAgICAgYXJyYXkuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgaS0tO1xyXG4gICAgICAgICAgbC0tO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBhY2NlcHQ6IGZ1bmN0aW9uKG9iamVjdCkge1xyXG4gICAgICBpZiAoIW9iamVjdCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHRoaXMuY3VycmVudCkge1xyXG4gICAgICAgIHRoaXMucGFyZW50cy51bnNoaWZ0KHRoaXMuY3VycmVudCk7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5jdXJyZW50ID0gb2JqZWN0O1xyXG5cclxuICAgICAgdmFyIHJldCA9IHRoaXNbb2JqZWN0LnR5cGVdKG9iamVjdCk7XHJcblxyXG4gICAgICB0aGlzLmN1cnJlbnQgPSB0aGlzLnBhcmVudHMuc2hpZnQoKTtcclxuXHJcbiAgICAgIGlmICghdGhpcy5tdXRhdGluZyB8fCByZXQpIHtcclxuICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgICB9IGVsc2UgaWYgKHJldCAhPT0gZmFsc2UpIHtcclxuICAgICAgICByZXR1cm4gb2JqZWN0O1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIFByb2dyYW06IGZ1bmN0aW9uKHByb2dyYW0pIHtcclxuICAgICAgdGhpcy5hY2NlcHRBcnJheShwcm9ncmFtLmJvZHkpO1xyXG4gICAgfSxcclxuXHJcbiAgICBNdXN0YWNoZVN0YXRlbWVudDogZnVuY3Rpb24obXVzdGFjaGUpIHtcclxuICAgICAgdGhpcy5hY2NlcHRSZXF1aXJlZChtdXN0YWNoZSwgJ3BhdGgnKTtcclxuICAgICAgdGhpcy5hY2NlcHRBcnJheShtdXN0YWNoZS5wYXJhbXMpO1xyXG4gICAgICB0aGlzLmFjY2VwdEtleShtdXN0YWNoZSwgJ2hhc2gnKTtcclxuICAgIH0sXHJcblxyXG4gICAgQmxvY2tTdGF0ZW1lbnQ6IGZ1bmN0aW9uKGJsb2NrKSB7XHJcbiAgICAgIHRoaXMuYWNjZXB0UmVxdWlyZWQoYmxvY2ssICdwYXRoJyk7XHJcbiAgICAgIHRoaXMuYWNjZXB0QXJyYXkoYmxvY2sucGFyYW1zKTtcclxuICAgICAgdGhpcy5hY2NlcHRLZXkoYmxvY2ssICdoYXNoJyk7XHJcblxyXG4gICAgICB0aGlzLmFjY2VwdEtleShibG9jaywgJ3Byb2dyYW0nKTtcclxuICAgICAgdGhpcy5hY2NlcHRLZXkoYmxvY2ssICdpbnZlcnNlJyk7XHJcbiAgICB9LFxyXG5cclxuICAgIFBhcnRpYWxTdGF0ZW1lbnQ6IGZ1bmN0aW9uKHBhcnRpYWwpIHtcclxuICAgICAgdGhpcy5hY2NlcHRSZXF1aXJlZChwYXJ0aWFsLCAnbmFtZScpO1xyXG4gICAgICB0aGlzLmFjY2VwdEFycmF5KHBhcnRpYWwucGFyYW1zKTtcclxuICAgICAgdGhpcy5hY2NlcHRLZXkocGFydGlhbCwgJ2hhc2gnKTtcclxuICAgIH0sXHJcblxyXG4gICAgQ29udGVudFN0YXRlbWVudDogZnVuY3Rpb24oLyogY29udGVudCAqLykge30sXHJcbiAgICBDb21tZW50U3RhdGVtZW50OiBmdW5jdGlvbigvKiBjb21tZW50ICovKSB7fSxcclxuXHJcbiAgICBTdWJFeHByZXNzaW9uOiBmdW5jdGlvbihzZXhwcikge1xyXG4gICAgICB0aGlzLmFjY2VwdFJlcXVpcmVkKHNleHByLCAncGF0aCcpO1xyXG4gICAgICB0aGlzLmFjY2VwdEFycmF5KHNleHByLnBhcmFtcyk7XHJcbiAgICAgIHRoaXMuYWNjZXB0S2V5KHNleHByLCAnaGFzaCcpO1xyXG4gICAgfSxcclxuICAgIFBhcnRpYWxFeHByZXNzaW9uOiBmdW5jdGlvbihwYXJ0aWFsKSB7XHJcbiAgICAgIHRoaXMuYWNjZXB0UmVxdWlyZWQocGFydGlhbCwgJ25hbWUnKTtcclxuICAgICAgdGhpcy5hY2NlcHRBcnJheShwYXJ0aWFsLnBhcmFtcyk7XHJcbiAgICAgIHRoaXMuYWNjZXB0S2V5KHBhcnRpYWwsICdoYXNoJyk7XHJcbiAgICB9LFxyXG5cclxuICAgIFBhdGhFeHByZXNzaW9uOiBmdW5jdGlvbigvKiBwYXRoICovKSB7fSxcclxuXHJcbiAgICBTdHJpbmdMaXRlcmFsOiBmdW5jdGlvbigvKiBzdHJpbmcgKi8pIHt9LFxyXG4gICAgTnVtYmVyTGl0ZXJhbDogZnVuY3Rpb24oLyogbnVtYmVyICovKSB7fSxcclxuICAgIEJvb2xlYW5MaXRlcmFsOiBmdW5jdGlvbigvKiBib29sICovKSB7fSxcclxuXHJcbiAgICBIYXNoOiBmdW5jdGlvbihoYXNoKSB7XHJcbiAgICAgIHRoaXMuYWNjZXB0QXJyYXkoaGFzaC5wYWlycyk7XHJcbiAgICB9LFxyXG4gICAgSGFzaFBhaXI6IGZ1bmN0aW9uKHBhaXIpIHtcclxuICAgICAgdGhpcy5hY2NlcHRSZXF1aXJlZChwYWlyLCAndmFsdWUnKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBfX2V4cG9ydHNfXyA9IFZpc2l0b3I7XHJcbiAgcmV0dXJuIF9fZXhwb3J0c19fO1xyXG59KShfX21vZHVsZTRfXywgX19tb2R1bGU3X18pO1xyXG5cclxuLy8gaGFuZGxlYmFycy9jb21waWxlci93aGl0ZXNwYWNlLWNvbnRyb2wuanNcclxudmFyIF9fbW9kdWxlMTBfXyA9IChmdW5jdGlvbihfX2RlcGVuZGVuY3kxX18pIHtcclxuICBcInVzZSBzdHJpY3RcIjtcclxuICB2YXIgX19leHBvcnRzX187XHJcbiAgdmFyIFZpc2l0b3IgPSBfX2RlcGVuZGVuY3kxX187XHJcblxyXG4gIGZ1bmN0aW9uIFdoaXRlc3BhY2VDb250cm9sKCkge1xyXG4gIH1cclxuICBXaGl0ZXNwYWNlQ29udHJvbC5wcm90b3R5cGUgPSBuZXcgVmlzaXRvcigpO1xyXG5cclxuICBXaGl0ZXNwYWNlQ29udHJvbC5wcm90b3R5cGUuUHJvZ3JhbSA9IGZ1bmN0aW9uKHByb2dyYW0pIHtcclxuICAgIHZhciBpc1Jvb3QgPSAhdGhpcy5pc1Jvb3RTZWVuO1xyXG4gICAgdGhpcy5pc1Jvb3RTZWVuID0gdHJ1ZTtcclxuXHJcbiAgICB2YXIgYm9keSA9IHByb2dyYW0uYm9keTtcclxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gYm9keS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgICAgdmFyIGN1cnJlbnQgPSBib2R5W2ldLFxyXG4gICAgICAgICAgc3RyaXAgPSB0aGlzLmFjY2VwdChjdXJyZW50KTtcclxuXHJcbiAgICAgIGlmICghc3RyaXApIHtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIF9pc1ByZXZXaGl0ZXNwYWNlID0gaXNQcmV2V2hpdGVzcGFjZShib2R5LCBpLCBpc1Jvb3QpLFxyXG4gICAgICAgICAgX2lzTmV4dFdoaXRlc3BhY2UgPSBpc05leHRXaGl0ZXNwYWNlKGJvZHksIGksIGlzUm9vdCksXHJcblxyXG4gICAgICAgICAgb3BlblN0YW5kYWxvbmUgPSBzdHJpcC5vcGVuU3RhbmRhbG9uZSAmJiBfaXNQcmV2V2hpdGVzcGFjZSxcclxuICAgICAgICAgIGNsb3NlU3RhbmRhbG9uZSA9IHN0cmlwLmNsb3NlU3RhbmRhbG9uZSAmJiBfaXNOZXh0V2hpdGVzcGFjZSxcclxuICAgICAgICAgIGlubGluZVN0YW5kYWxvbmUgPSBzdHJpcC5pbmxpbmVTdGFuZGFsb25lICYmIF9pc1ByZXZXaGl0ZXNwYWNlICYmIF9pc05leHRXaGl0ZXNwYWNlO1xyXG5cclxuICAgICAgaWYgKHN0cmlwLmNsb3NlKSB7XHJcbiAgICAgICAgb21pdFJpZ2h0KGJvZHksIGksIHRydWUpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChzdHJpcC5vcGVuKSB7XHJcbiAgICAgICAgb21pdExlZnQoYm9keSwgaSwgdHJ1ZSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChpbmxpbmVTdGFuZGFsb25lKSB7XHJcbiAgICAgICAgb21pdFJpZ2h0KGJvZHksIGkpO1xyXG5cclxuICAgICAgICBpZiAob21pdExlZnQoYm9keSwgaSkpIHtcclxuICAgICAgICAgIC8vIElmIHdlIGFyZSBvbiBhIHN0YW5kYWxvbmUgbm9kZSwgc2F2ZSB0aGUgaW5kZW50IGluZm8gZm9yIHBhcnRpYWxzXHJcbiAgICAgICAgICBpZiAoY3VycmVudC50eXBlID09PSAnUGFydGlhbFN0YXRlbWVudCcpIHtcclxuICAgICAgICAgICAgLy8gUHVsbCBvdXQgdGhlIHdoaXRlc3BhY2UgZnJvbSB0aGUgZmluYWwgbGluZVxyXG4gICAgICAgICAgICBjdXJyZW50LmluZGVudCA9ICgvKFsgXFx0XSskKS8pLmV4ZWMoYm9keVtpLTFdLm9yaWdpbmFsKVsxXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgaWYgKG9wZW5TdGFuZGFsb25lKSB7XHJcbiAgICAgICAgb21pdFJpZ2h0KChjdXJyZW50LnByb2dyYW0gfHwgY3VycmVudC5pbnZlcnNlKS5ib2R5KTtcclxuXHJcbiAgICAgICAgLy8gU3RyaXAgb3V0IHRoZSBwcmV2aW91cyBjb250ZW50IG5vZGUgaWYgaXQncyB3aGl0ZXNwYWNlIG9ubHlcclxuICAgICAgICBvbWl0TGVmdChib2R5LCBpKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoY2xvc2VTdGFuZGFsb25lKSB7XHJcbiAgICAgICAgLy8gQWx3YXlzIHN0cmlwIHRoZSBuZXh0IG5vZGVcclxuICAgICAgICBvbWl0UmlnaHQoYm9keSwgaSk7XHJcblxyXG4gICAgICAgIG9taXRMZWZ0KChjdXJyZW50LmludmVyc2UgfHwgY3VycmVudC5wcm9ncmFtKS5ib2R5KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwcm9ncmFtO1xyXG4gIH07XHJcbiAgV2hpdGVzcGFjZUNvbnRyb2wucHJvdG90eXBlLkJsb2NrU3RhdGVtZW50ID0gZnVuY3Rpb24oYmxvY2spIHtcclxuICAgIHRoaXMuYWNjZXB0KGJsb2NrLnByb2dyYW0pO1xyXG4gICAgdGhpcy5hY2NlcHQoYmxvY2suaW52ZXJzZSk7XHJcblxyXG4gICAgLy8gRmluZCB0aGUgaW52ZXJzZSBwcm9ncmFtIHRoYXQgaXMgaW52b2xlZCB3aXRoIHdoaXRlc3BhY2Ugc3RyaXBwaW5nLlxyXG4gICAgdmFyIHByb2dyYW0gPSBibG9jay5wcm9ncmFtIHx8IGJsb2NrLmludmVyc2UsXHJcbiAgICAgICAgaW52ZXJzZSA9IGJsb2NrLnByb2dyYW0gJiYgYmxvY2suaW52ZXJzZSxcclxuICAgICAgICBmaXJzdEludmVyc2UgPSBpbnZlcnNlLFxyXG4gICAgICAgIGxhc3RJbnZlcnNlID0gaW52ZXJzZTtcclxuXHJcbiAgICBpZiAoaW52ZXJzZSAmJiBpbnZlcnNlLmNoYWluZWQpIHtcclxuICAgICAgZmlyc3RJbnZlcnNlID0gaW52ZXJzZS5ib2R5WzBdLnByb2dyYW07XHJcblxyXG4gICAgICAvLyBXYWxrIHRoZSBpbnZlcnNlIGNoYWluIHRvIGZpbmQgdGhlIGxhc3QgaW52ZXJzZSB0aGF0IGlzIGFjdHVhbGx5IGluIHRoZSBjaGFpbi5cclxuICAgICAgd2hpbGUgKGxhc3RJbnZlcnNlLmNoYWluZWQpIHtcclxuICAgICAgICBsYXN0SW52ZXJzZSA9IGxhc3RJbnZlcnNlLmJvZHlbbGFzdEludmVyc2UuYm9keS5sZW5ndGgtMV0ucHJvZ3JhbTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHZhciBzdHJpcCA9IHtcclxuICAgICAgb3BlbjogYmxvY2sub3BlblN0cmlwLm9wZW4sXHJcbiAgICAgIGNsb3NlOiBibG9jay5jbG9zZVN0cmlwLmNsb3NlLFxyXG5cclxuICAgICAgLy8gRGV0ZXJtaW5lIHRoZSBzdGFuZGFsb25lIGNhbmRpYWN5LiBCYXNpY2FsbHkgZmxhZyBvdXIgY29udGVudCBhcyBiZWluZyBwb3NzaWJseSBzdGFuZGFsb25lXHJcbiAgICAgIC8vIHNvIG91ciBwYXJlbnQgY2FuIGRldGVybWluZSBpZiB3ZSBhY3R1YWxseSBhcmUgc3RhbmRhbG9uZVxyXG4gICAgICBvcGVuU3RhbmRhbG9uZTogaXNOZXh0V2hpdGVzcGFjZShwcm9ncmFtLmJvZHkpLFxyXG4gICAgICBjbG9zZVN0YW5kYWxvbmU6IGlzUHJldldoaXRlc3BhY2UoKGZpcnN0SW52ZXJzZSB8fCBwcm9ncmFtKS5ib2R5KVxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAoYmxvY2sub3BlblN0cmlwLmNsb3NlKSB7XHJcbiAgICAgIG9taXRSaWdodChwcm9ncmFtLmJvZHksIG51bGwsIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChpbnZlcnNlKSB7XHJcbiAgICAgIHZhciBpbnZlcnNlU3RyaXAgPSBibG9jay5pbnZlcnNlU3RyaXA7XHJcblxyXG4gICAgICBpZiAoaW52ZXJzZVN0cmlwLm9wZW4pIHtcclxuICAgICAgICBvbWl0TGVmdChwcm9ncmFtLmJvZHksIG51bGwsIHRydWUpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoaW52ZXJzZVN0cmlwLmNsb3NlKSB7XHJcbiAgICAgICAgb21pdFJpZ2h0KGZpcnN0SW52ZXJzZS5ib2R5LCBudWxsLCB0cnVlKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoYmxvY2suY2xvc2VTdHJpcC5vcGVuKSB7XHJcbiAgICAgICAgb21pdExlZnQobGFzdEludmVyc2UuYm9keSwgbnVsbCwgdHJ1ZSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEZpbmQgc3RhbmRhbG9uZSBlbHNlIHN0YXRtZW50c1xyXG4gICAgICBpZiAoaXNQcmV2V2hpdGVzcGFjZShwcm9ncmFtLmJvZHkpXHJcbiAgICAgICAgICAmJiBpc05leHRXaGl0ZXNwYWNlKGZpcnN0SW52ZXJzZS5ib2R5KSkge1xyXG5cclxuICAgICAgICBvbWl0TGVmdChwcm9ncmFtLmJvZHkpO1xyXG4gICAgICAgIG9taXRSaWdodChmaXJzdEludmVyc2UuYm9keSk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlmIChibG9jay5jbG9zZVN0cmlwLm9wZW4pIHtcclxuICAgICAgICBvbWl0TGVmdChwcm9ncmFtLmJvZHksIG51bGwsIHRydWUpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHN0cmlwO1xyXG4gIH07XHJcblxyXG4gIFdoaXRlc3BhY2VDb250cm9sLnByb3RvdHlwZS5NdXN0YWNoZVN0YXRlbWVudCA9IGZ1bmN0aW9uKG11c3RhY2hlKSB7XHJcbiAgICByZXR1cm4gbXVzdGFjaGUuc3RyaXA7XHJcbiAgfTtcclxuXHJcbiAgV2hpdGVzcGFjZUNvbnRyb2wucHJvdG90eXBlLlBhcnRpYWxTdGF0ZW1lbnQgPSBcclxuICAgICAgV2hpdGVzcGFjZUNvbnRyb2wucHJvdG90eXBlLkNvbW1lbnRTdGF0ZW1lbnQgPSBmdW5jdGlvbihub2RlKSB7XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgdmFyIHN0cmlwID0gbm9kZS5zdHJpcCB8fCB7fTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGlubGluZVN0YW5kYWxvbmU6IHRydWUsXHJcbiAgICAgIG9wZW46IHN0cmlwLm9wZW4sXHJcbiAgICAgIGNsb3NlOiBzdHJpcC5jbG9zZVxyXG4gICAgfTtcclxuICB9O1xyXG5cclxuXHJcbiAgZnVuY3Rpb24gaXNQcmV2V2hpdGVzcGFjZShib2R5LCBpLCBpc1Jvb3QpIHtcclxuICAgIGlmIChpID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgaSA9IGJvZHkubGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIE5vZGVzIHRoYXQgZW5kIHdpdGggbmV3bGluZXMgYXJlIGNvbnNpZGVyZWQgd2hpdGVzcGFjZSAoYnV0IGFyZSBzcGVjaWFsXHJcbiAgICAvLyBjYXNlZCBmb3Igc3RyaXAgb3BlcmF0aW9ucylcclxuICAgIHZhciBwcmV2ID0gYm9keVtpLTFdLFxyXG4gICAgICAgIHNpYmxpbmcgPSBib2R5W2ktMl07XHJcbiAgICBpZiAoIXByZXYpIHtcclxuICAgICAgcmV0dXJuIGlzUm9vdDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocHJldi50eXBlID09PSAnQ29udGVudFN0YXRlbWVudCcpIHtcclxuICAgICAgcmV0dXJuIChzaWJsaW5nIHx8ICFpc1Jvb3QgPyAoL1xccj9cXG5cXHMqPyQvKSA6ICgvKF58XFxyP1xcbilcXHMqPyQvKSkudGVzdChwcmV2Lm9yaWdpbmFsKTtcclxuICAgIH1cclxuICB9XHJcbiAgZnVuY3Rpb24gaXNOZXh0V2hpdGVzcGFjZShib2R5LCBpLCBpc1Jvb3QpIHtcclxuICAgIGlmIChpID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgaSA9IC0xO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBuZXh0ID0gYm9keVtpKzFdLFxyXG4gICAgICAgIHNpYmxpbmcgPSBib2R5W2krMl07XHJcbiAgICBpZiAoIW5leHQpIHtcclxuICAgICAgcmV0dXJuIGlzUm9vdDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobmV4dC50eXBlID09PSAnQ29udGVudFN0YXRlbWVudCcpIHtcclxuICAgICAgcmV0dXJuIChzaWJsaW5nIHx8ICFpc1Jvb3QgPyAoL15cXHMqP1xccj9cXG4vKSA6ICgvXlxccyo/KFxccj9cXG58JCkvKSkudGVzdChuZXh0Lm9yaWdpbmFsKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIE1hcmtzIHRoZSBub2RlIHRvIHRoZSByaWdodCBvZiB0aGUgcG9zaXRpb24gYXMgb21pdHRlZC5cclxuICAvLyBJLmUuIHt7Zm9vfX0nICcgd2lsbCBtYXJrIHRoZSAnICcgbm9kZSBhcyBvbWl0dGVkLlxyXG4gIC8vXHJcbiAgLy8gSWYgaSBpcyB1bmRlZmluZWQsIHRoZW4gdGhlIGZpcnN0IGNoaWxkIHdpbGwgYmUgbWFya2VkIGFzIHN1Y2guXHJcbiAgLy9cclxuICAvLyBJZiBtdWxpdHBsZSBpcyB0cnV0aHkgdGhlbiBhbGwgd2hpdGVzcGFjZSB3aWxsIGJlIHN0cmlwcGVkIG91dCB1bnRpbCBub24td2hpdGVzcGFjZVxyXG4gIC8vIGNvbnRlbnQgaXMgbWV0LlxyXG4gIGZ1bmN0aW9uIG9taXRSaWdodChib2R5LCBpLCBtdWx0aXBsZSkge1xyXG4gICAgdmFyIGN1cnJlbnQgPSBib2R5W2kgPT0gbnVsbCA/IDAgOiBpICsgMV07XHJcbiAgICBpZiAoIWN1cnJlbnQgfHwgY3VycmVudC50eXBlICE9PSAnQ29udGVudFN0YXRlbWVudCcgfHwgKCFtdWx0aXBsZSAmJiBjdXJyZW50LnJpZ2h0U3RyaXBwZWQpKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgb3JpZ2luYWwgPSBjdXJyZW50LnZhbHVlO1xyXG4gICAgY3VycmVudC52YWx1ZSA9IGN1cnJlbnQudmFsdWUucmVwbGFjZShtdWx0aXBsZSA/ICgvXlxccysvKSA6ICgvXlsgXFx0XSpcXHI/XFxuPy8pLCAnJyk7XHJcbiAgICBjdXJyZW50LnJpZ2h0U3RyaXBwZWQgPSBjdXJyZW50LnZhbHVlICE9PSBvcmlnaW5hbDtcclxuICB9XHJcblxyXG4gIC8vIE1hcmtzIHRoZSBub2RlIHRvIHRoZSBsZWZ0IG9mIHRoZSBwb3NpdGlvbiBhcyBvbWl0dGVkLlxyXG4gIC8vIEkuZS4gJyAne3tmb299fSB3aWxsIG1hcmsgdGhlICcgJyBub2RlIGFzIG9taXR0ZWQuXHJcbiAgLy9cclxuICAvLyBJZiBpIGlzIHVuZGVmaW5lZCB0aGVuIHRoZSBsYXN0IGNoaWxkIHdpbGwgYmUgbWFya2VkIGFzIHN1Y2guXHJcbiAgLy9cclxuICAvLyBJZiBtdWxpdHBsZSBpcyB0cnV0aHkgdGhlbiBhbGwgd2hpdGVzcGFjZSB3aWxsIGJlIHN0cmlwcGVkIG91dCB1bnRpbCBub24td2hpdGVzcGFjZVxyXG4gIC8vIGNvbnRlbnQgaXMgbWV0LlxyXG4gIGZ1bmN0aW9uIG9taXRMZWZ0KGJvZHksIGksIG11bHRpcGxlKSB7XHJcbiAgICB2YXIgY3VycmVudCA9IGJvZHlbaSA9PSBudWxsID8gYm9keS5sZW5ndGggLSAxIDogaSAtIDFdO1xyXG4gICAgaWYgKCFjdXJyZW50IHx8IGN1cnJlbnQudHlwZSAhPT0gJ0NvbnRlbnRTdGF0ZW1lbnQnIHx8ICghbXVsdGlwbGUgJiYgY3VycmVudC5sZWZ0U3RyaXBwZWQpKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBXZSBvbWl0IHRoZSBsYXN0IG5vZGUgaWYgaXQncyB3aGl0ZXNwYWNlIG9ubHkgYW5kIG5vdCBwcmVjZWVkZWQgYnkgYSBub24tY29udGVudCBub2RlLlxyXG4gICAgdmFyIG9yaWdpbmFsID0gY3VycmVudC52YWx1ZTtcclxuICAgIGN1cnJlbnQudmFsdWUgPSBjdXJyZW50LnZhbHVlLnJlcGxhY2UobXVsdGlwbGUgPyAoL1xccyskLykgOiAoL1sgXFx0XSskLyksICcnKTtcclxuICAgIGN1cnJlbnQubGVmdFN0cmlwcGVkID0gY3VycmVudC52YWx1ZSAhPT0gb3JpZ2luYWw7XHJcbiAgICByZXR1cm4gY3VycmVudC5sZWZ0U3RyaXBwZWQ7XHJcbiAgfVxyXG5cclxuICBfX2V4cG9ydHNfXyA9IFdoaXRlc3BhY2VDb250cm9sO1xyXG4gIHJldHVybiBfX2V4cG9ydHNfXztcclxufSkoX19tb2R1bGUxMV9fKTtcclxuXHJcbi8vIGhhbmRsZWJhcnMvY29tcGlsZXIvaGVscGVycy5qc1xyXG52YXIgX19tb2R1bGUxMl9fID0gKGZ1bmN0aW9uKF9fZGVwZW5kZW5jeTFfXykge1xyXG4gIFwidXNlIHN0cmljdFwiO1xyXG4gIHZhciBfX2V4cG9ydHNfXyA9IHt9O1xyXG4gIHZhciBFeGNlcHRpb24gPSBfX2RlcGVuZGVuY3kxX187XHJcblxyXG4gIGZ1bmN0aW9uIFNvdXJjZUxvY2F0aW9uKHNvdXJjZSwgbG9jSW5mbykge1xyXG4gICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XHJcbiAgICB0aGlzLnN0YXJ0ID0ge1xyXG4gICAgICBsaW5lOiBsb2NJbmZvLmZpcnN0X2xpbmUsXHJcbiAgICAgIGNvbHVtbjogbG9jSW5mby5maXJzdF9jb2x1bW5cclxuICAgIH07XHJcbiAgICB0aGlzLmVuZCA9IHtcclxuICAgICAgbGluZTogbG9jSW5mby5sYXN0X2xpbmUsXHJcbiAgICAgIGNvbHVtbjogbG9jSW5mby5sYXN0X2NvbHVtblxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIF9fZXhwb3J0c19fLlNvdXJjZUxvY2F0aW9uID0gU291cmNlTG9jYXRpb247ZnVuY3Rpb24gc3RyaXBGbGFncyhvcGVuLCBjbG9zZSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgb3Blbjogb3Blbi5jaGFyQXQoMikgPT09ICd+JyxcclxuICAgICAgY2xvc2U6IGNsb3NlLmNoYXJBdChjbG9zZS5sZW5ndGgtMykgPT09ICd+J1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIF9fZXhwb3J0c19fLnN0cmlwRmxhZ3MgPSBzdHJpcEZsYWdzO2Z1bmN0aW9uIHN0cmlwQ29tbWVudChjb21tZW50KSB7XHJcbiAgICByZXR1cm4gY29tbWVudC5yZXBsYWNlKC9eXFx7XFx7fj9cXCEtPy0/LywgJycpXHJcbiAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8tPy0/fj9cXH1cXH0kLywgJycpO1xyXG4gIH1cclxuXHJcbiAgX19leHBvcnRzX18uc3RyaXBDb21tZW50ID0gc3RyaXBDb21tZW50O2Z1bmN0aW9uIHByZXBhcmVQYXRoKGRhdGEsIHBhcnRzLCBsb2NJbmZvKSB7XHJcbiAgICAvKmpzaGludCAtVzA0MCAqL1xyXG4gICAgbG9jSW5mbyA9IHRoaXMubG9jSW5mbyhsb2NJbmZvKTtcclxuXHJcbiAgICB2YXIgb3JpZ2luYWwgPSBkYXRhID8gJ0AnIDogJycsXHJcbiAgICAgICAgZGlnID0gW10sXHJcbiAgICAgICAgZGVwdGggPSAwLFxyXG4gICAgICAgIGRlcHRoU3RyaW5nID0gJyc7XHJcblxyXG4gICAgZm9yKHZhciBpPTAsbD1wYXJ0cy5sZW5ndGg7IGk8bDsgaSsrKSB7XHJcbiAgICAgIHZhciBwYXJ0ID0gcGFydHNbaV0ucGFydDtcclxuICAgICAgb3JpZ2luYWwgKz0gKHBhcnRzW2ldLnNlcGFyYXRvciB8fCAnJykgKyBwYXJ0O1xyXG5cclxuICAgICAgaWYgKHBhcnQgPT09ICcuLicgfHwgcGFydCA9PT0gJy4nIHx8IHBhcnQgPT09ICd0aGlzJykge1xyXG4gICAgICAgIGlmIChkaWcubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignSW52YWxpZCBwYXRoOiAnICsgb3JpZ2luYWwsIHtsb2M6IGxvY0luZm99KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHBhcnQgPT09ICcuLicpIHtcclxuICAgICAgICAgIGRlcHRoKys7XHJcbiAgICAgICAgICBkZXB0aFN0cmluZyArPSAnLi4vJztcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZGlnLnB1c2gocGFydCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV3IHRoaXMuUGF0aEV4cHJlc3Npb24oZGF0YSwgZGVwdGgsIGRpZywgb3JpZ2luYWwsIGxvY0luZm8pO1xyXG4gIH1cclxuXHJcbiAgX19leHBvcnRzX18ucHJlcGFyZVBhdGggPSBwcmVwYXJlUGF0aDtmdW5jdGlvbiBwcmVwYXJlTXVzdGFjaGUocGF0aCwgcGFyYW1zLCBoYXNoLCBvcGVuLCBzdHJpcCwgbG9jSW5mbykge1xyXG4gICAgLypqc2hpbnQgLVcwNDAgKi9cclxuICAgIC8vIE11c3QgdXNlIGNoYXJBdCB0byBzdXBwb3J0IElFIHByZS0xMFxyXG4gICAgdmFyIGVzY2FwZUZsYWcgPSBvcGVuLmNoYXJBdCgzKSB8fCBvcGVuLmNoYXJBdCgyKSxcclxuICAgICAgICBlc2NhcGVkID0gZXNjYXBlRmxhZyAhPT0gJ3snICYmIGVzY2FwZUZsYWcgIT09ICcmJztcclxuXHJcbiAgICByZXR1cm4gbmV3IHRoaXMuTXVzdGFjaGVTdGF0ZW1lbnQocGF0aCwgcGFyYW1zLCBoYXNoLCBlc2NhcGVkLCBzdHJpcCwgdGhpcy5sb2NJbmZvKGxvY0luZm8pKTtcclxuICB9XHJcblxyXG4gIF9fZXhwb3J0c19fLnByZXBhcmVNdXN0YWNoZSA9IHByZXBhcmVNdXN0YWNoZTtmdW5jdGlvbiBwcmVwYXJlUmF3QmxvY2sob3BlblJhd0Jsb2NrLCBjb250ZW50LCBjbG9zZSwgbG9jSW5mbykge1xyXG4gICAgLypqc2hpbnQgLVcwNDAgKi9cclxuICAgIGlmIChvcGVuUmF3QmxvY2sucGF0aC5vcmlnaW5hbCAhPT0gY2xvc2UpIHtcclxuICAgICAgdmFyIGVycm9yTm9kZSA9IHtsb2M6IG9wZW5SYXdCbG9jay5wYXRoLmxvY307XHJcblxyXG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKG9wZW5SYXdCbG9jay5wYXRoLm9yaWdpbmFsICsgXCIgZG9lc24ndCBtYXRjaCBcIiArIGNsb3NlLCBlcnJvck5vZGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvY0luZm8gPSB0aGlzLmxvY0luZm8obG9jSW5mbyk7XHJcbiAgICB2YXIgcHJvZ3JhbSA9IG5ldyB0aGlzLlByb2dyYW0oW2NvbnRlbnRdLCBudWxsLCB7fSwgbG9jSW5mbyk7XHJcblxyXG4gICAgcmV0dXJuIG5ldyB0aGlzLkJsb2NrU3RhdGVtZW50KFxyXG4gICAgICAgIG9wZW5SYXdCbG9jay5wYXRoLCBvcGVuUmF3QmxvY2sucGFyYW1zLCBvcGVuUmF3QmxvY2suaGFzaCxcclxuICAgICAgICBwcm9ncmFtLCB1bmRlZmluZWQsXHJcbiAgICAgICAge30sIHt9LCB7fSxcclxuICAgICAgICBsb2NJbmZvKTtcclxuICB9XHJcblxyXG4gIF9fZXhwb3J0c19fLnByZXBhcmVSYXdCbG9jayA9IHByZXBhcmVSYXdCbG9jaztmdW5jdGlvbiBwcmVwYXJlQmxvY2sob3BlbkJsb2NrLCBwcm9ncmFtLCBpbnZlcnNlQW5kUHJvZ3JhbSwgY2xvc2UsIGludmVydGVkLCBsb2NJbmZvKSB7XHJcbiAgICAvKmpzaGludCAtVzA0MCAqL1xyXG4gICAgLy8gV2hlbiB3ZSBhcmUgY2hhaW5pbmcgaW52ZXJzZSBjYWxscywgd2Ugd2lsbCBub3QgaGF2ZSBhIGNsb3NlIHBhdGhcclxuICAgIGlmIChjbG9zZSAmJiBjbG9zZS5wYXRoICYmIG9wZW5CbG9jay5wYXRoLm9yaWdpbmFsICE9PSBjbG9zZS5wYXRoLm9yaWdpbmFsKSB7XHJcbiAgICAgIHZhciBlcnJvck5vZGUgPSB7bG9jOiBvcGVuQmxvY2sucGF0aC5sb2N9O1xyXG5cclxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihvcGVuQmxvY2sucGF0aC5vcmlnaW5hbCArICcgZG9lc25cXCd0IG1hdGNoICcgKyBjbG9zZS5wYXRoLm9yaWdpbmFsLCBlcnJvck5vZGUpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb2dyYW0uYmxvY2tQYXJhbXMgPSBvcGVuQmxvY2suYmxvY2tQYXJhbXM7XHJcblxyXG4gICAgdmFyIGludmVyc2UsXHJcbiAgICAgICAgaW52ZXJzZVN0cmlwO1xyXG5cclxuICAgIGlmIChpbnZlcnNlQW5kUHJvZ3JhbSkge1xyXG4gICAgICBpZiAoaW52ZXJzZUFuZFByb2dyYW0uY2hhaW4pIHtcclxuICAgICAgICBpbnZlcnNlQW5kUHJvZ3JhbS5wcm9ncmFtLmJvZHlbMF0uY2xvc2VTdHJpcCA9IGNsb3NlLnN0cmlwO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpbnZlcnNlU3RyaXAgPSBpbnZlcnNlQW5kUHJvZ3JhbS5zdHJpcDtcclxuICAgICAgaW52ZXJzZSA9IGludmVyc2VBbmRQcm9ncmFtLnByb2dyYW07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGludmVydGVkKSB7XHJcbiAgICAgIGludmVydGVkID0gaW52ZXJzZTtcclxuICAgICAgaW52ZXJzZSA9IHByb2dyYW07XHJcbiAgICAgIHByb2dyYW0gPSBpbnZlcnRlZDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV3IHRoaXMuQmxvY2tTdGF0ZW1lbnQoXHJcbiAgICAgICAgb3BlbkJsb2NrLnBhdGgsIG9wZW5CbG9jay5wYXJhbXMsIG9wZW5CbG9jay5oYXNoLFxyXG4gICAgICAgIHByb2dyYW0sIGludmVyc2UsXHJcbiAgICAgICAgb3BlbkJsb2NrLnN0cmlwLCBpbnZlcnNlU3RyaXAsIGNsb3NlICYmIGNsb3NlLnN0cmlwLFxyXG4gICAgICAgIHRoaXMubG9jSW5mbyhsb2NJbmZvKSk7XHJcbiAgfVxyXG5cclxuICBfX2V4cG9ydHNfXy5wcmVwYXJlQmxvY2sgPSBwcmVwYXJlQmxvY2s7XHJcbiAgcmV0dXJuIF9fZXhwb3J0c19fO1xyXG59KShfX21vZHVsZTRfXyk7XHJcblxyXG4vLyBoYW5kbGViYXJzL2NvbXBpbGVyL2Jhc2UuanNcclxudmFyIF9fbW9kdWxlOF9fID0gKGZ1bmN0aW9uKF9fZGVwZW5kZW5jeTFfXywgX19kZXBlbmRlbmN5Ml9fLCBfX2RlcGVuZGVuY3kzX18sIF9fZGVwZW5kZW5jeTRfXywgX19kZXBlbmRlbmN5NV9fKSB7XHJcbiAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgdmFyIF9fZXhwb3J0c19fID0ge307XHJcbiAgdmFyIHBhcnNlciA9IF9fZGVwZW5kZW5jeTFfXztcclxuICB2YXIgQVNUID0gX19kZXBlbmRlbmN5Ml9fO1xyXG4gIHZhciBXaGl0ZXNwYWNlQ29udHJvbCA9IF9fZGVwZW5kZW5jeTNfXztcclxuICB2YXIgSGVscGVycyA9IF9fZGVwZW5kZW5jeTRfXztcclxuICB2YXIgZXh0ZW5kID0gX19kZXBlbmRlbmN5NV9fLmV4dGVuZDtcclxuXHJcbiAgX19leHBvcnRzX18ucGFyc2VyID0gcGFyc2VyO1xyXG5cclxuICB2YXIgeXkgPSB7fTtcclxuICBleHRlbmQoeXksIEhlbHBlcnMsIEFTVCk7XHJcblxyXG4gIGZ1bmN0aW9uIHBhcnNlKGlucHV0LCBvcHRpb25zKSB7XHJcbiAgICAvLyBKdXN0IHJldHVybiBpZiBhbiBhbHJlYWR5LWNvbXBpbGVkIEFTVCB3YXMgcGFzc2VkIGluLlxyXG4gICAgaWYgKGlucHV0LnR5cGUgPT09ICdQcm9ncmFtJykgeyByZXR1cm4gaW5wdXQ7IH1cclxuXHJcbiAgICBwYXJzZXIueXkgPSB5eTtcclxuXHJcbiAgICAvLyBBbHRlcmluZyB0aGUgc2hhcmVkIG9iamVjdCBoZXJlLCBidXQgdGhpcyBpcyBvayBhcyBwYXJzZXIgaXMgYSBzeW5jIG9wZXJhdGlvblxyXG4gICAgeXkubG9jSW5mbyA9IGZ1bmN0aW9uKGxvY0luZm8pIHtcclxuICAgICAgcmV0dXJuIG5ldyB5eS5Tb3VyY2VMb2NhdGlvbihvcHRpb25zICYmIG9wdGlvbnMuc3JjTmFtZSwgbG9jSW5mbyk7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBzdHJpcCA9IG5ldyBXaGl0ZXNwYWNlQ29udHJvbCgpO1xyXG4gICAgcmV0dXJuIHN0cmlwLmFjY2VwdChwYXJzZXIucGFyc2UoaW5wdXQpKTtcclxuICB9XHJcblxyXG4gIF9fZXhwb3J0c19fLnBhcnNlID0gcGFyc2U7XHJcbiAgcmV0dXJuIF9fZXhwb3J0c19fO1xyXG59KShfX21vZHVsZTlfXywgX19tb2R1bGU3X18sIF9fbW9kdWxlMTBfXywgX19tb2R1bGUxMl9fLCBfX21vZHVsZTNfXyk7XHJcblxyXG4vLyBoYW5kbGViYXJzL2NvbXBpbGVyL2NvbXBpbGVyLmpzXHJcbnZhciBfX21vZHVsZTEzX18gPSAoZnVuY3Rpb24oX19kZXBlbmRlbmN5MV9fLCBfX2RlcGVuZGVuY3kyX18sIF9fZGVwZW5kZW5jeTNfXykge1xyXG4gIFwidXNlIHN0cmljdFwiO1xyXG4gIHZhciBfX2V4cG9ydHNfXyA9IHt9O1xyXG4gIHZhciBFeGNlcHRpb24gPSBfX2RlcGVuZGVuY3kxX187XHJcbiAgdmFyIGlzQXJyYXkgPSBfX2RlcGVuZGVuY3kyX18uaXNBcnJheTtcclxuICB2YXIgaW5kZXhPZiA9IF9fZGVwZW5kZW5jeTJfXy5pbmRleE9mO1xyXG4gIHZhciBBU1QgPSBfX2RlcGVuZGVuY3kzX187XHJcblxyXG4gIHZhciBzbGljZSA9IFtdLnNsaWNlO1xyXG5cclxuXHJcbiAgZnVuY3Rpb24gQ29tcGlsZXIoKSB7fVxyXG5cclxuICBfX2V4cG9ydHNfXy5Db21waWxlciA9IENvbXBpbGVyOy8vIHRoZSBmb3VuZEhlbHBlciByZWdpc3RlciB3aWxsIGRpc2FtYmlndWF0ZSBoZWxwZXIgbG9va3VwIGZyb20gZmluZGluZyBhXHJcbiAgLy8gZnVuY3Rpb24gaW4gYSBjb250ZXh0LiBUaGlzIGlzIG5lY2Vzc2FyeSBmb3IgbXVzdGFjaGUgY29tcGF0aWJpbGl0eSwgd2hpY2hcclxuICAvLyByZXF1aXJlcyB0aGF0IGNvbnRleHQgZnVuY3Rpb25zIGluIGJsb2NrcyBhcmUgZXZhbHVhdGVkIGJ5IGJsb2NrSGVscGVyTWlzc2luZyxcclxuICAvLyBhbmQgdGhlbiBwcm9jZWVkIGFzIGlmIHRoZSByZXN1bHRpbmcgdmFsdWUgd2FzIHByb3ZpZGVkIHRvIGJsb2NrSGVscGVyTWlzc2luZy5cclxuXHJcbiAgQ29tcGlsZXIucHJvdG90eXBlID0ge1xyXG4gICAgY29tcGlsZXI6IENvbXBpbGVyLFxyXG5cclxuICAgIGVxdWFsczogZnVuY3Rpb24ob3RoZXIpIHtcclxuICAgICAgdmFyIGxlbiA9IHRoaXMub3Bjb2Rlcy5sZW5ndGg7XHJcbiAgICAgIGlmIChvdGhlci5vcGNvZGVzLmxlbmd0aCAhPT0gbGVuKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgdmFyIG9wY29kZSA9IHRoaXMub3Bjb2Rlc1tpXSxcclxuICAgICAgICAgICAgb3RoZXJPcGNvZGUgPSBvdGhlci5vcGNvZGVzW2ldO1xyXG4gICAgICAgIGlmIChvcGNvZGUub3Bjb2RlICE9PSBvdGhlck9wY29kZS5vcGNvZGUgfHwgIWFyZ0VxdWFscyhvcGNvZGUuYXJncywgb3RoZXJPcGNvZGUuYXJncykpIHtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFdlIGtub3cgdGhhdCBsZW5ndGggaXMgdGhlIHNhbWUgYmV0d2VlbiB0aGUgdHdvIGFycmF5cyBiZWNhdXNlIHRoZXkgYXJlIGRpcmVjdGx5IHRpZWRcclxuICAgICAgLy8gdG8gdGhlIG9wY29kZSBiZWhhdmlvciBhYm92ZS5cclxuICAgICAgbGVuID0gdGhpcy5jaGlsZHJlbi5sZW5ndGg7XHJcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgIGlmICghdGhpcy5jaGlsZHJlbltpXS5lcXVhbHMob3RoZXIuY2hpbGRyZW5baV0pKSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0sXHJcblxyXG4gICAgZ3VpZDogMCxcclxuXHJcbiAgICBjb21waWxlOiBmdW5jdGlvbihwcm9ncmFtLCBvcHRpb25zKSB7XHJcbiAgICAgIHRoaXMuc291cmNlTm9kZSA9IFtdO1xyXG4gICAgICB0aGlzLm9wY29kZXMgPSBbXTtcclxuICAgICAgdGhpcy5jaGlsZHJlbiA9IFtdO1xyXG4gICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xyXG4gICAgICB0aGlzLnN0cmluZ1BhcmFtcyA9IG9wdGlvbnMuc3RyaW5nUGFyYW1zO1xyXG4gICAgICB0aGlzLnRyYWNrSWRzID0gb3B0aW9ucy50cmFja0lkcztcclxuXHJcbiAgICAgIG9wdGlvbnMuYmxvY2tQYXJhbXMgPSBvcHRpb25zLmJsb2NrUGFyYW1zIHx8IFtdO1xyXG5cclxuICAgICAgLy8gVGhlc2UgY2hhbmdlcyB3aWxsIHByb3BhZ2F0ZSB0byB0aGUgb3RoZXIgY29tcGlsZXIgY29tcG9uZW50c1xyXG4gICAgICB2YXIga25vd25IZWxwZXJzID0gb3B0aW9ucy5rbm93bkhlbHBlcnM7XHJcbiAgICAgIG9wdGlvbnMua25vd25IZWxwZXJzID0ge1xyXG4gICAgICAgICdoZWxwZXJNaXNzaW5nJzogdHJ1ZSxcclxuICAgICAgICAnYmxvY2tIZWxwZXJNaXNzaW5nJzogdHJ1ZSxcclxuICAgICAgICAnZWFjaCc6IHRydWUsXHJcbiAgICAgICAgJ2lmJzogdHJ1ZSxcclxuICAgICAgICAndW5sZXNzJzogdHJ1ZSxcclxuICAgICAgICAnd2l0aCc6IHRydWUsXHJcbiAgICAgICAgJ2xvZyc6IHRydWUsXHJcbiAgICAgICAgJ2xvb2t1cCc6IHRydWVcclxuICAgICAgfTtcclxuICAgICAgaWYgKGtub3duSGVscGVycykge1xyXG4gICAgICAgIGZvciAodmFyIG5hbWUgaW4ga25vd25IZWxwZXJzKSB7XHJcbiAgICAgICAgICBvcHRpb25zLmtub3duSGVscGVyc1tuYW1lXSA9IGtub3duSGVscGVyc1tuYW1lXTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmFjY2VwdChwcm9ncmFtKTtcclxuICAgIH0sXHJcblxyXG4gICAgY29tcGlsZVByb2dyYW06IGZ1bmN0aW9uKHByb2dyYW0pIHtcclxuICAgICAgdmFyIHJlc3VsdCA9IG5ldyB0aGlzLmNvbXBpbGVyKCkuY29tcGlsZShwcm9ncmFtLCB0aGlzLm9wdGlvbnMpO1xyXG4gICAgICB2YXIgZ3VpZCA9IHRoaXMuZ3VpZCsrO1xyXG5cclxuICAgICAgdGhpcy51c2VQYXJ0aWFsID0gdGhpcy51c2VQYXJ0aWFsIHx8IHJlc3VsdC51c2VQYXJ0aWFsO1xyXG5cclxuICAgICAgdGhpcy5jaGlsZHJlbltndWlkXSA9IHJlc3VsdDtcclxuICAgICAgdGhpcy51c2VEZXB0aHMgPSB0aGlzLnVzZURlcHRocyB8fCByZXN1bHQudXNlRGVwdGhzO1xyXG5cclxuICAgICAgcmV0dXJuIGd1aWQ7XHJcbiAgICB9LFxyXG5cclxuICAgIGFjY2VwdDogZnVuY3Rpb24obm9kZSkge1xyXG4gICAgICB0aGlzLnNvdXJjZU5vZGUudW5zaGlmdChub2RlKTtcclxuICAgICAgdmFyIHJldCA9IHRoaXNbbm9kZS50eXBlXShub2RlKTtcclxuICAgICAgdGhpcy5zb3VyY2VOb2RlLnNoaWZ0KCk7XHJcbiAgICAgIHJldHVybiByZXQ7XHJcbiAgICB9LFxyXG5cclxuICAgIFByb2dyYW06IGZ1bmN0aW9uKHByb2dyYW0pIHtcclxuICAgICAgdGhpcy5vcHRpb25zLmJsb2NrUGFyYW1zLnVuc2hpZnQocHJvZ3JhbS5ibG9ja1BhcmFtcyk7XHJcblxyXG4gICAgICB2YXIgYm9keSA9IHByb2dyYW0uYm9keTtcclxuICAgICAgZm9yKHZhciBpPTAsIGw9Ym9keS5sZW5ndGg7IGk8bDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5hY2NlcHQoYm9keVtpXSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMub3B0aW9ucy5ibG9ja1BhcmFtcy5zaGlmdCgpO1xyXG5cclxuICAgICAgdGhpcy5pc1NpbXBsZSA9IGwgPT09IDE7XHJcbiAgICAgIHRoaXMuYmxvY2tQYXJhbXMgPSBwcm9ncmFtLmJsb2NrUGFyYW1zID8gcHJvZ3JhbS5ibG9ja1BhcmFtcy5sZW5ndGggOiAwO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG5cclxuICAgIEJsb2NrU3RhdGVtZW50OiBmdW5jdGlvbihibG9jaykge1xyXG4gICAgICB0cmFuc2Zvcm1MaXRlcmFsVG9QYXRoKGJsb2NrKTtcclxuXHJcbiAgICAgIHZhciBwcm9ncmFtID0gYmxvY2sucHJvZ3JhbSxcclxuICAgICAgICAgIGludmVyc2UgPSBibG9jay5pbnZlcnNlO1xyXG5cclxuICAgICAgcHJvZ3JhbSA9IHByb2dyYW0gJiYgdGhpcy5jb21waWxlUHJvZ3JhbShwcm9ncmFtKTtcclxuICAgICAgaW52ZXJzZSA9IGludmVyc2UgJiYgdGhpcy5jb21waWxlUHJvZ3JhbShpbnZlcnNlKTtcclxuXHJcbiAgICAgIHZhciB0eXBlID0gdGhpcy5jbGFzc2lmeVNleHByKGJsb2NrKTtcclxuXHJcbiAgICAgIGlmICh0eXBlID09PSAnaGVscGVyJykge1xyXG4gICAgICAgIHRoaXMuaGVscGVyU2V4cHIoYmxvY2ssIHByb2dyYW0sIGludmVyc2UpO1xyXG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdzaW1wbGUnKSB7XHJcbiAgICAgICAgdGhpcy5zaW1wbGVTZXhwcihibG9jayk7XHJcblxyXG4gICAgICAgIC8vIG5vdyB0aGF0IHRoZSBzaW1wbGUgbXVzdGFjaGUgaXMgcmVzb2x2ZWQsIHdlIG5lZWQgdG9cclxuICAgICAgICAvLyBldmFsdWF0ZSBpdCBieSBleGVjdXRpbmcgYGJsb2NrSGVscGVyTWlzc2luZ2BcclxuICAgICAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBwcm9ncmFtKTtcclxuICAgICAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBpbnZlcnNlKTtcclxuICAgICAgICB0aGlzLm9wY29kZSgnZW1wdHlIYXNoJyk7XHJcbiAgICAgICAgdGhpcy5vcGNvZGUoJ2Jsb2NrVmFsdWUnLCBibG9jay5wYXRoLm9yaWdpbmFsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmFtYmlndW91c1NleHByKGJsb2NrLCBwcm9ncmFtLCBpbnZlcnNlKTtcclxuXHJcbiAgICAgICAgLy8gbm93IHRoYXQgdGhlIHNpbXBsZSBtdXN0YWNoZSBpcyByZXNvbHZlZCwgd2UgbmVlZCB0b1xyXG4gICAgICAgIC8vIGV2YWx1YXRlIGl0IGJ5IGV4ZWN1dGluZyBgYmxvY2tIZWxwZXJNaXNzaW5nYFxyXG4gICAgICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHByb2dyYW0pO1xyXG4gICAgICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIGludmVyc2UpO1xyXG4gICAgICAgIHRoaXMub3Bjb2RlKCdlbXB0eUhhc2gnKTtcclxuICAgICAgICB0aGlzLm9wY29kZSgnYW1iaWd1b3VzQmxvY2tWYWx1ZScpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLm9wY29kZSgnYXBwZW5kJyk7XHJcbiAgICB9LFxyXG5cclxuICAgIFBhcnRpYWxTdGF0ZW1lbnQ6IGZ1bmN0aW9uKHBhcnRpYWwpIHtcclxuICAgICAgdGhpcy51c2VQYXJ0aWFsID0gdHJ1ZTtcclxuXHJcbiAgICAgIHZhciBwYXJhbXMgPSBwYXJ0aWFsLnBhcmFtcztcclxuICAgICAgaWYgKHBhcmFtcy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignVW5zdXBwb3J0ZWQgbnVtYmVyIG9mIHBhcnRpYWwgYXJndW1lbnRzOiAnICsgcGFyYW1zLmxlbmd0aCwgcGFydGlhbCk7XHJcbiAgICAgIH0gZWxzZSBpZiAoIXBhcmFtcy5sZW5ndGgpIHtcclxuICAgICAgICBwYXJhbXMucHVzaCh7dHlwZTogJ1BhdGhFeHByZXNzaW9uJywgcGFydHM6IFtdLCBkZXB0aDogMH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgcGFydGlhbE5hbWUgPSBwYXJ0aWFsLm5hbWUub3JpZ2luYWwsXHJcbiAgICAgICAgICBpc0R5bmFtaWMgPSBwYXJ0aWFsLm5hbWUudHlwZSA9PT0gJ1N1YkV4cHJlc3Npb24nO1xyXG4gICAgICBpZiAoaXNEeW5hbWljKSB7XHJcbiAgICAgICAgdGhpcy5hY2NlcHQocGFydGlhbC5uYW1lKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5zZXR1cEZ1bGxNdXN0YWNoZVBhcmFtcyhwYXJ0aWFsLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdHJ1ZSk7XHJcblxyXG4gICAgICB2YXIgaW5kZW50ID0gcGFydGlhbC5pbmRlbnQgfHwgJyc7XHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMucHJldmVudEluZGVudCAmJiBpbmRlbnQpIHtcclxuICAgICAgICB0aGlzLm9wY29kZSgnYXBwZW5kQ29udGVudCcsIGluZGVudCk7XHJcbiAgICAgICAgaW5kZW50ID0gJyc7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMub3Bjb2RlKCdpbnZva2VQYXJ0aWFsJywgaXNEeW5hbWljLCBwYXJ0aWFsTmFtZSwgaW5kZW50KTtcclxuICAgICAgdGhpcy5vcGNvZGUoJ2FwcGVuZCcpO1xyXG4gICAgfSxcclxuXHJcbiAgICBNdXN0YWNoZVN0YXRlbWVudDogZnVuY3Rpb24obXVzdGFjaGUpIHtcclxuICAgICAgdGhpcy5TdWJFeHByZXNzaW9uKG11c3RhY2hlKTtcclxuXHJcbiAgICAgIGlmKG11c3RhY2hlLmVzY2FwZWQgJiYgIXRoaXMub3B0aW9ucy5ub0VzY2FwZSkge1xyXG4gICAgICAgIHRoaXMub3Bjb2RlKCdhcHBlbmRFc2NhcGVkJyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5vcGNvZGUoJ2FwcGVuZCcpO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIENvbnRlbnRTdGF0ZW1lbnQ6IGZ1bmN0aW9uKGNvbnRlbnQpIHtcclxuICAgICAgaWYgKGNvbnRlbnQudmFsdWUpIHtcclxuICAgICAgICB0aGlzLm9wY29kZSgnYXBwZW5kQ29udGVudCcsIGNvbnRlbnQudmFsdWUpO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIENvbW1lbnRTdGF0ZW1lbnQ6IGZ1bmN0aW9uKCkge30sXHJcblxyXG4gICAgU3ViRXhwcmVzc2lvbjogZnVuY3Rpb24oc2V4cHIpIHtcclxuICAgICAgdHJhbnNmb3JtTGl0ZXJhbFRvUGF0aChzZXhwcik7XHJcbiAgICAgIHZhciB0eXBlID0gdGhpcy5jbGFzc2lmeVNleHByKHNleHByKTtcclxuXHJcbiAgICAgIGlmICh0eXBlID09PSAnc2ltcGxlJykge1xyXG4gICAgICAgIHRoaXMuc2ltcGxlU2V4cHIoc2V4cHIpO1xyXG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdoZWxwZXInKSB7XHJcbiAgICAgICAgdGhpcy5oZWxwZXJTZXhwcihzZXhwcik7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5hbWJpZ3VvdXNTZXhwcihzZXhwcik7XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBhbWJpZ3VvdXNTZXhwcjogZnVuY3Rpb24oc2V4cHIsIHByb2dyYW0sIGludmVyc2UpIHtcclxuICAgICAgdmFyIHBhdGggPSBzZXhwci5wYXRoLFxyXG4gICAgICAgICAgbmFtZSA9IHBhdGgucGFydHNbMF0sXHJcbiAgICAgICAgICBpc0Jsb2NrID0gcHJvZ3JhbSAhPSBudWxsIHx8IGludmVyc2UgIT0gbnVsbDtcclxuXHJcbiAgICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgcGF0aC5kZXB0aCk7XHJcblxyXG4gICAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBwcm9ncmFtKTtcclxuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgaW52ZXJzZSk7XHJcblxyXG4gICAgICB0aGlzLmFjY2VwdChwYXRoKTtcclxuXHJcbiAgICAgIHRoaXMub3Bjb2RlKCdpbnZva2VBbWJpZ3VvdXMnLCBuYW1lLCBpc0Jsb2NrKTtcclxuICAgIH0sXHJcblxyXG4gICAgc2ltcGxlU2V4cHI6IGZ1bmN0aW9uKHNleHByKSB7XHJcbiAgICAgIHRoaXMuYWNjZXB0KHNleHByLnBhdGgpO1xyXG4gICAgICB0aGlzLm9wY29kZSgncmVzb2x2ZVBvc3NpYmxlTGFtYmRhJyk7XHJcbiAgICB9LFxyXG5cclxuICAgIGhlbHBlclNleHByOiBmdW5jdGlvbihzZXhwciwgcHJvZ3JhbSwgaW52ZXJzZSkge1xyXG4gICAgICB2YXIgcGFyYW1zID0gdGhpcy5zZXR1cEZ1bGxNdXN0YWNoZVBhcmFtcyhzZXhwciwgcHJvZ3JhbSwgaW52ZXJzZSksXHJcbiAgICAgICAgICBwYXRoID0gc2V4cHIucGF0aCxcclxuICAgICAgICAgIG5hbWUgPSBwYXRoLnBhcnRzWzBdO1xyXG5cclxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnNbbmFtZV0pIHtcclxuICAgICAgICB0aGlzLm9wY29kZSgnaW52b2tlS25vd25IZWxwZXInLCBwYXJhbXMubGVuZ3RoLCBuYW1lKTtcclxuICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMua25vd25IZWxwZXJzT25seSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJZb3Ugc3BlY2lmaWVkIGtub3duSGVscGVyc09ubHksIGJ1dCB1c2VkIHRoZSB1bmtub3duIGhlbHBlciBcIiArIG5hbWUsIHNleHByKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBwYXRoLmZhbHN5ID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgdGhpcy5hY2NlcHQocGF0aCk7XHJcbiAgICAgICAgdGhpcy5vcGNvZGUoJ2ludm9rZUhlbHBlcicsIHBhcmFtcy5sZW5ndGgsIHBhdGgub3JpZ2luYWwsIEFTVC5oZWxwZXJzLnNpbXBsZUlkKHBhdGgpKTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBQYXRoRXhwcmVzc2lvbjogZnVuY3Rpb24ocGF0aCkge1xyXG4gICAgICB0aGlzLmFkZERlcHRoKHBhdGguZGVwdGgpO1xyXG4gICAgICB0aGlzLm9wY29kZSgnZ2V0Q29udGV4dCcsIHBhdGguZGVwdGgpO1xyXG5cclxuICAgICAgdmFyIG5hbWUgPSBwYXRoLnBhcnRzWzBdLFxyXG4gICAgICAgICAgc2NvcGVkID0gQVNULmhlbHBlcnMuc2NvcGVkSWQocGF0aCksXHJcbiAgICAgICAgICBibG9ja1BhcmFtSWQgPSAhcGF0aC5kZXB0aCAmJiAhc2NvcGVkICYmIHRoaXMuYmxvY2tQYXJhbUluZGV4KG5hbWUpO1xyXG5cclxuICAgICAgaWYgKGJsb2NrUGFyYW1JZCkge1xyXG4gICAgICAgIHRoaXMub3Bjb2RlKCdsb29rdXBCbG9ja1BhcmFtJywgYmxvY2tQYXJhbUlkLCBwYXRoLnBhcnRzKTtcclxuICAgICAgfSBlbHNlICBpZiAoIW5hbWUpIHtcclxuICAgICAgICAvLyBDb250ZXh0IHJlZmVyZW5jZSwgaS5lLiBge3tmb28gLn19YCBvciBge3tmb28gLi59fWBcclxuICAgICAgICB0aGlzLm9wY29kZSgncHVzaENvbnRleHQnKTtcclxuICAgICAgfSBlbHNlIGlmIChwYXRoLmRhdGEpIHtcclxuICAgICAgICB0aGlzLm9wdGlvbnMuZGF0YSA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5vcGNvZGUoJ2xvb2t1cERhdGEnLCBwYXRoLmRlcHRoLCBwYXRoLnBhcnRzKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLm9wY29kZSgnbG9va3VwT25Db250ZXh0JywgcGF0aC5wYXJ0cywgcGF0aC5mYWxzeSwgc2NvcGVkKTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBTdHJpbmdMaXRlcmFsOiBmdW5jdGlvbihzdHJpbmcpIHtcclxuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hTdHJpbmcnLCBzdHJpbmcudmFsdWUpO1xyXG4gICAgfSxcclxuXHJcbiAgICBOdW1iZXJMaXRlcmFsOiBmdW5jdGlvbihudW1iZXIpIHtcclxuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hMaXRlcmFsJywgbnVtYmVyLnZhbHVlKTtcclxuICAgIH0sXHJcblxyXG4gICAgQm9vbGVhbkxpdGVyYWw6IGZ1bmN0aW9uKGJvb2wpIHtcclxuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hMaXRlcmFsJywgYm9vbC52YWx1ZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIEhhc2g6IGZ1bmN0aW9uKGhhc2gpIHtcclxuICAgICAgdmFyIHBhaXJzID0gaGFzaC5wYWlycywgaSwgbDtcclxuXHJcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoSGFzaCcpO1xyXG5cclxuICAgICAgZm9yIChpPTAsIGw9cGFpcnMubGVuZ3RoOyBpPGw7IGkrKykge1xyXG4gICAgICAgIHRoaXMucHVzaFBhcmFtKHBhaXJzW2ldLnZhbHVlKTtcclxuICAgICAgfVxyXG4gICAgICB3aGlsZSAoaS0tKSB7XHJcbiAgICAgICAgdGhpcy5vcGNvZGUoJ2Fzc2lnblRvSGFzaCcsIHBhaXJzW2ldLmtleSk7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5vcGNvZGUoJ3BvcEhhc2gnKTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gSEVMUEVSU1xyXG4gICAgb3Bjb2RlOiBmdW5jdGlvbihuYW1lKSB7XHJcbiAgICAgIHRoaXMub3Bjb2Rlcy5wdXNoKHsgb3Bjb2RlOiBuYW1lLCBhcmdzOiBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGxvYzogdGhpcy5zb3VyY2VOb2RlWzBdLmxvYyB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgYWRkRGVwdGg6IGZ1bmN0aW9uKGRlcHRoKSB7XHJcbiAgICAgIGlmICghZGVwdGgpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMudXNlRGVwdGhzID0gdHJ1ZTtcclxuICAgIH0sXHJcblxyXG4gICAgY2xhc3NpZnlTZXhwcjogZnVuY3Rpb24oc2V4cHIpIHtcclxuICAgICAgdmFyIGlzU2ltcGxlID0gQVNULmhlbHBlcnMuc2ltcGxlSWQoc2V4cHIucGF0aCk7XHJcblxyXG4gICAgICB2YXIgaXNCbG9ja1BhcmFtID0gaXNTaW1wbGUgJiYgISF0aGlzLmJsb2NrUGFyYW1JbmRleChzZXhwci5wYXRoLnBhcnRzWzBdKTtcclxuXHJcbiAgICAgIC8vIGEgbXVzdGFjaGUgaXMgYW4gZWxpZ2libGUgaGVscGVyIGlmOlxyXG4gICAgICAvLyAqIGl0cyBpZCBpcyBzaW1wbGUgKGEgc2luZ2xlIHBhcnQsIG5vdCBgdGhpc2Agb3IgYC4uYClcclxuICAgICAgdmFyIGlzSGVscGVyID0gIWlzQmxvY2tQYXJhbSAmJiBBU1QuaGVscGVycy5oZWxwZXJFeHByZXNzaW9uKHNleHByKTtcclxuXHJcbiAgICAgIC8vIGlmIGEgbXVzdGFjaGUgaXMgYW4gZWxpZ2libGUgaGVscGVyIGJ1dCBub3QgYSBkZWZpbml0ZVxyXG4gICAgICAvLyBoZWxwZXIsIGl0IGlzIGFtYmlndW91cywgYW5kIHdpbGwgYmUgcmVzb2x2ZWQgaW4gYSBsYXRlclxyXG4gICAgICAvLyBwYXNzIG9yIGF0IHJ1bnRpbWUuXHJcbiAgICAgIHZhciBpc0VsaWdpYmxlID0gIWlzQmxvY2tQYXJhbSAmJiAoaXNIZWxwZXIgfHwgaXNTaW1wbGUpO1xyXG5cclxuICAgICAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XHJcblxyXG4gICAgICAvLyBpZiBhbWJpZ3VvdXMsIHdlIGNhbiBwb3NzaWJseSByZXNvbHZlIHRoZSBhbWJpZ3VpdHkgbm93XHJcbiAgICAgIC8vIEFuIGVsaWdpYmxlIGhlbHBlciBpcyBvbmUgdGhhdCBkb2VzIG5vdCBoYXZlIGEgY29tcGxleCBwYXRoLCBpLmUuIGB0aGlzLmZvb2AsIGAuLi9mb29gIGV0Yy5cclxuICAgICAgaWYgKGlzRWxpZ2libGUgJiYgIWlzSGVscGVyKSB7XHJcbiAgICAgICAgdmFyIG5hbWUgPSBzZXhwci5wYXRoLnBhcnRzWzBdO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5rbm93bkhlbHBlcnNbbmFtZV0pIHtcclxuICAgICAgICAgIGlzSGVscGVyID0gdHJ1ZTtcclxuICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMua25vd25IZWxwZXJzT25seSkge1xyXG4gICAgICAgICAgaXNFbGlnaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGlzSGVscGVyKSB7IHJldHVybiAnaGVscGVyJzsgfVxyXG4gICAgICBlbHNlIGlmIChpc0VsaWdpYmxlKSB7IHJldHVybiAnYW1iaWd1b3VzJzsgfVxyXG4gICAgICBlbHNlIHsgcmV0dXJuICdzaW1wbGUnOyB9XHJcbiAgICB9LFxyXG5cclxuICAgIHB1c2hQYXJhbXM6IGZ1bmN0aW9uKHBhcmFtcykge1xyXG4gICAgICBmb3IodmFyIGk9MCwgbD1wYXJhbXMubGVuZ3RoOyBpPGw7IGkrKykge1xyXG4gICAgICAgIHRoaXMucHVzaFBhcmFtKHBhcmFtc1tpXSk7XHJcbiAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgcHVzaFBhcmFtOiBmdW5jdGlvbih2YWwpIHtcclxuICAgICAgdmFyIHZhbHVlID0gdmFsLnZhbHVlICE9IG51bGwgPyB2YWwudmFsdWUgOiB2YWwub3JpZ2luYWwgfHwgJyc7XHJcblxyXG4gICAgICBpZiAodGhpcy5zdHJpbmdQYXJhbXMpIHtcclxuICAgICAgICBpZiAodmFsdWUucmVwbGFjZSkge1xyXG4gICAgICAgICAgdmFsdWUgPSB2YWx1ZVxyXG4gICAgICAgICAgICAgIC5yZXBsYWNlKC9eKFxcLj9cXC5cXC8pKi9nLCAnJylcclxuICAgICAgICAgICAgICAucmVwbGFjZSgvXFwvL2csICcuJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih2YWwuZGVwdGgpIHtcclxuICAgICAgICAgIHRoaXMuYWRkRGVwdGgodmFsLmRlcHRoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5vcGNvZGUoJ2dldENvbnRleHQnLCB2YWwuZGVwdGggfHwgMCk7XHJcbiAgICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hTdHJpbmdQYXJhbScsIHZhbHVlLCB2YWwudHlwZSk7XHJcblxyXG4gICAgICAgIGlmICh2YWwudHlwZSA9PT0gJ1N1YkV4cHJlc3Npb24nKSB7XHJcbiAgICAgICAgICAvLyBTdWJFeHByZXNzaW9ucyBnZXQgZXZhbHVhdGVkIGFuZCBwYXNzZWQgaW5cclxuICAgICAgICAgIC8vIGluIHN0cmluZyBwYXJhbXMgbW9kZS5cclxuICAgICAgICAgIHRoaXMuYWNjZXB0KHZhbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmICh0aGlzLnRyYWNrSWRzKSB7XHJcbiAgICAgICAgICB2YXIgYmxvY2tQYXJhbUluZGV4O1xyXG4gICAgICAgICAgaWYgKHZhbC5wYXJ0cyAmJiAhQVNULmhlbHBlcnMuc2NvcGVkSWQodmFsKSAmJiAhdmFsLmRlcHRoKSB7XHJcbiAgICAgICAgICAgICBibG9ja1BhcmFtSW5kZXggPSB0aGlzLmJsb2NrUGFyYW1JbmRleCh2YWwucGFydHNbMF0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKGJsb2NrUGFyYW1JbmRleCkge1xyXG4gICAgICAgICAgICB2YXIgYmxvY2tQYXJhbUNoaWxkID0gdmFsLnBhcnRzLnNsaWNlKDEpLmpvaW4oJy4nKTtcclxuICAgICAgICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hJZCcsICdCbG9ja1BhcmFtJywgYmxvY2tQYXJhbUluZGV4LCBibG9ja1BhcmFtQ2hpbGQpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdmFsdWUgPSB2YWwub3JpZ2luYWwgfHwgdmFsdWU7XHJcbiAgICAgICAgICAgIGlmICh2YWx1ZS5yZXBsYWNlKSB7XHJcbiAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVxyXG4gICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXlxcLlxcLy9nLCAnJylcclxuICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL15cXC4kL2csICcnKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hJZCcsIHZhbC50eXBlLCB2YWx1ZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuYWNjZXB0KHZhbCk7XHJcbiAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgc2V0dXBGdWxsTXVzdGFjaGVQYXJhbXM6IGZ1bmN0aW9uKHNleHByLCBwcm9ncmFtLCBpbnZlcnNlLCBvbWl0RW1wdHkpIHtcclxuICAgICAgdmFyIHBhcmFtcyA9IHNleHByLnBhcmFtcztcclxuICAgICAgdGhpcy5wdXNoUGFyYW1zKHBhcmFtcyk7XHJcblxyXG4gICAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBwcm9ncmFtKTtcclxuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgaW52ZXJzZSk7XHJcblxyXG4gICAgICBpZiAoc2V4cHIuaGFzaCkge1xyXG4gICAgICAgIHRoaXMuYWNjZXB0KHNleHByLmhhc2gpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMub3Bjb2RlKCdlbXB0eUhhc2gnLCBvbWl0RW1wdHkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gcGFyYW1zO1xyXG4gICAgfSxcclxuXHJcbiAgICBibG9ja1BhcmFtSW5kZXg6IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgZm9yICh2YXIgZGVwdGggPSAwLCBsZW4gPSB0aGlzLm9wdGlvbnMuYmxvY2tQYXJhbXMubGVuZ3RoOyBkZXB0aCA8IGxlbjsgZGVwdGgrKykge1xyXG4gICAgICAgIHZhciBibG9ja1BhcmFtcyA9IHRoaXMub3B0aW9ucy5ibG9ja1BhcmFtc1tkZXB0aF0sXHJcbiAgICAgICAgICAgIHBhcmFtID0gYmxvY2tQYXJhbXMgJiYgaW5kZXhPZihibG9ja1BhcmFtcywgbmFtZSk7XHJcbiAgICAgICAgaWYgKGJsb2NrUGFyYW1zICYmIHBhcmFtID49IDApIHtcclxuICAgICAgICAgIHJldHVybiBbZGVwdGgsIHBhcmFtXTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG5cclxuICBmdW5jdGlvbiBwcmVjb21waWxlKGlucHV0LCBvcHRpb25zLCBlbnYpIHtcclxuICAgIGlmIChpbnB1dCA9PSBudWxsIHx8ICh0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnICYmIGlucHV0LnR5cGUgIT09ICdQcm9ncmFtJykpIHtcclxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIllvdSBtdXN0IHBhc3MgYSBzdHJpbmcgb3IgSGFuZGxlYmFycyBBU1QgdG8gSGFuZGxlYmFycy5wcmVjb21waWxlLiBZb3UgcGFzc2VkIFwiICsgaW5wdXQpO1xyXG4gICAgfVxyXG5cclxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgaWYgKCEoJ2RhdGEnIGluIG9wdGlvbnMpKSB7XHJcbiAgICAgIG9wdGlvbnMuZGF0YSA9IHRydWU7XHJcbiAgICB9XHJcbiAgICBpZiAob3B0aW9ucy5jb21wYXQpIHtcclxuICAgICAgb3B0aW9ucy51c2VEZXB0aHMgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBhc3QgPSBlbnYucGFyc2UoaW5wdXQsIG9wdGlvbnMpO1xyXG4gICAgdmFyIGVudmlyb25tZW50ID0gbmV3IGVudi5Db21waWxlcigpLmNvbXBpbGUoYXN0LCBvcHRpb25zKTtcclxuICAgIHJldHVybiBuZXcgZW52LkphdmFTY3JpcHRDb21waWxlcigpLmNvbXBpbGUoZW52aXJvbm1lbnQsIG9wdGlvbnMpO1xyXG4gIH1cclxuXHJcbiAgX19leHBvcnRzX18ucHJlY29tcGlsZSA9IHByZWNvbXBpbGU7ZnVuY3Rpb24gY29tcGlsZShpbnB1dCwgb3B0aW9ucywgZW52KSB7XHJcbiAgICBpZiAoaW5wdXQgPT0gbnVsbCB8fCAodHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJyAmJiBpbnB1dC50eXBlICE9PSAnUHJvZ3JhbScpKSB7XHJcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJZb3UgbXVzdCBwYXNzIGEgc3RyaW5nIG9yIEhhbmRsZWJhcnMgQVNUIHRvIEhhbmRsZWJhcnMuY29tcGlsZS4gWW91IHBhc3NlZCBcIiArIGlucHV0KTtcclxuICAgIH1cclxuXHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuXHJcbiAgICBpZiAoISgnZGF0YScgaW4gb3B0aW9ucykpIHtcclxuICAgICAgb3B0aW9ucy5kYXRhID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIGlmIChvcHRpb25zLmNvbXBhdCkge1xyXG4gICAgICBvcHRpb25zLnVzZURlcHRocyA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGNvbXBpbGVkO1xyXG5cclxuICAgIGZ1bmN0aW9uIGNvbXBpbGVJbnB1dCgpIHtcclxuICAgICAgdmFyIGFzdCA9IGVudi5wYXJzZShpbnB1dCwgb3B0aW9ucyk7XHJcbiAgICAgIHZhciBlbnZpcm9ubWVudCA9IG5ldyBlbnYuQ29tcGlsZXIoKS5jb21waWxlKGFzdCwgb3B0aW9ucyk7XHJcbiAgICAgIHZhciB0ZW1wbGF0ZVNwZWMgPSBuZXcgZW52LkphdmFTY3JpcHRDb21waWxlcigpLmNvbXBpbGUoZW52aXJvbm1lbnQsIG9wdGlvbnMsIHVuZGVmaW5lZCwgdHJ1ZSk7XHJcbiAgICAgIHJldHVybiBlbnYudGVtcGxhdGUodGVtcGxhdGVTcGVjKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBUZW1wbGF0ZSBpcyBvbmx5IGNvbXBpbGVkIG9uIGZpcnN0IHVzZSBhbmQgY2FjaGVkIGFmdGVyIHRoYXQgcG9pbnQuXHJcbiAgICB2YXIgcmV0ID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xyXG4gICAgICBpZiAoIWNvbXBpbGVkKSB7XHJcbiAgICAgICAgY29tcGlsZWQgPSBjb21waWxlSW5wdXQoKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gY29tcGlsZWQuY2FsbCh0aGlzLCBjb250ZXh0LCBvcHRpb25zKTtcclxuICAgIH07XHJcbiAgICByZXQuX3NldHVwID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG4gICAgICBpZiAoIWNvbXBpbGVkKSB7XHJcbiAgICAgICAgY29tcGlsZWQgPSBjb21waWxlSW5wdXQoKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gY29tcGlsZWQuX3NldHVwKG9wdGlvbnMpO1xyXG4gICAgfTtcclxuICAgIHJldC5fY2hpbGQgPSBmdW5jdGlvbihpLCBkYXRhLCBibG9ja1BhcmFtcywgZGVwdGhzKSB7XHJcbiAgICAgIGlmICghY29tcGlsZWQpIHtcclxuICAgICAgICBjb21waWxlZCA9IGNvbXBpbGVJbnB1dCgpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBjb21waWxlZC5fY2hpbGQoaSwgZGF0YSwgYmxvY2tQYXJhbXMsIGRlcHRocyk7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIHJldDtcclxuICB9XHJcblxyXG4gIF9fZXhwb3J0c19fLmNvbXBpbGUgPSBjb21waWxlO2Z1bmN0aW9uIGFyZ0VxdWFscyhhLCBiKSB7XHJcbiAgICBpZiAoYSA9PT0gYikge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoaXNBcnJheShhKSAmJiBpc0FycmF5KGIpICYmIGEubGVuZ3RoID09PSBiLmxlbmd0aCkge1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAoIWFyZ0VxdWFscyhhW2ldLCBiW2ldKSkge1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHRyYW5zZm9ybUxpdGVyYWxUb1BhdGgoc2V4cHIpIHtcclxuICAgIGlmICghc2V4cHIucGF0aC5wYXJ0cykge1xyXG4gICAgICB2YXIgbGl0ZXJhbCA9IHNleHByLnBhdGg7XHJcbiAgICAgIC8vIENhc3RpbmcgdG8gc3RyaW5nIGhlcmUgdG8gbWFrZSBmYWxzZSBhbmQgMCBsaXRlcmFsIHZhbHVlcyBwbGF5IG5pY2VseSB3aXRoIHRoZSByZXN0XHJcbiAgICAgIC8vIG9mIHRoZSBzeXN0ZW0uXHJcbiAgICAgIHNleHByLnBhdGggPSBuZXcgQVNULlBhdGhFeHByZXNzaW9uKGZhbHNlLCAwLCBbbGl0ZXJhbC5vcmlnaW5hbCsnJ10sIGxpdGVyYWwub3JpZ2luYWwrJycsIGxpdGVyYWwubG9nKTtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIF9fZXhwb3J0c19fO1xyXG59KShfX21vZHVsZTRfXywgX19tb2R1bGUzX18sIF9fbW9kdWxlN19fKTtcclxuXHJcbi8vIGhhbmRsZWJhcnMvY29tcGlsZXIvY29kZS1nZW4uanNcclxudmFyIF9fbW9kdWxlMTVfXyA9IChmdW5jdGlvbihfX2RlcGVuZGVuY3kxX18pIHtcclxuICBcInVzZSBzdHJpY3RcIjtcclxuICB2YXIgX19leHBvcnRzX187XHJcbiAgdmFyIGlzQXJyYXkgPSBfX2RlcGVuZGVuY3kxX18uaXNBcnJheTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIHZhciBTb3VyY2VNYXAgPSByZXF1aXJlKCdzb3VyY2UtbWFwJyksXHJcbiAgICAgICAgICBTb3VyY2VOb2RlID0gU291cmNlTWFwLlNvdXJjZU5vZGU7XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dDogdGVzdGVkIGJ1dCBub3QgY292ZXJlZCBpbiBpc3RhbmJ1bCBkdWUgdG8gZGlzdCBidWlsZCAgKi9cclxuICAgIFNvdXJjZU5vZGUgPSBmdW5jdGlvbihsaW5lLCBjb2x1bW4sIHNyY0ZpbGUsIGNodW5rcykge1xyXG4gICAgICB0aGlzLnNyYyA9ICcnO1xyXG4gICAgICBpZiAoY2h1bmtzKSB7XHJcbiAgICAgICAgdGhpcy5hZGQoY2h1bmtzKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICBTb3VyY2VOb2RlLnByb3RvdHlwZSA9IHtcclxuICAgICAgYWRkOiBmdW5jdGlvbihjaHVua3MpIHtcclxuICAgICAgICBpZiAoaXNBcnJheShjaHVua3MpKSB7XHJcbiAgICAgICAgICBjaHVua3MgPSBjaHVua3Muam9pbignJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuc3JjICs9IGNodW5rcztcclxuICAgICAgfSxcclxuICAgICAgcHJlcGVuZDogZnVuY3Rpb24oY2h1bmtzKSB7XHJcbiAgICAgICAgaWYgKGlzQXJyYXkoY2h1bmtzKSkge1xyXG4gICAgICAgICAgY2h1bmtzID0gY2h1bmtzLmpvaW4oJycpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnNyYyA9IGNodW5rcyArIHRoaXMuc3JjO1xyXG4gICAgICB9LFxyXG4gICAgICB0b1N0cmluZ1dpdGhTb3VyY2VNYXA6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB7Y29kZTogdGhpcy50b1N0cmluZygpfTtcclxuICAgICAgfSxcclxuICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNyYztcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9XHJcblxyXG5cclxuICBmdW5jdGlvbiBjYXN0Q2h1bmsoY2h1bmssIGNvZGVHZW4sIGxvYykge1xyXG4gICAgaWYgKGlzQXJyYXkoY2h1bmspKSB7XHJcbiAgICAgIHZhciByZXQgPSBbXTtcclxuXHJcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjaHVuay5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgIHJldC5wdXNoKGNvZGVHZW4ud3JhcChjaHVua1tpXSwgbG9jKSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHJldDtcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGNodW5rID09PSAnYm9vbGVhbicgfHwgdHlwZW9mIGNodW5rID09PSAnbnVtYmVyJykge1xyXG4gICAgICAvLyBIYW5kbGUgcHJpbWl0aXZlcyB0aGF0IHRoZSBTb3VyY2VOb2RlIHdpbGwgdGhyb3cgdXAgb25cclxuICAgICAgcmV0dXJuIGNodW5rKycnO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNodW5rO1xyXG4gIH1cclxuXHJcblxyXG4gIGZ1bmN0aW9uIENvZGVHZW4oc3JjRmlsZSkge1xyXG4gICAgdGhpcy5zcmNGaWxlID0gc3JjRmlsZTtcclxuICAgIHRoaXMuc291cmNlID0gW107XHJcbiAgfVxyXG5cclxuICBDb2RlR2VuLnByb3RvdHlwZSA9IHtcclxuICAgIHByZXBlbmQ6IGZ1bmN0aW9uKHNvdXJjZSwgbG9jKSB7XHJcbiAgICAgIHRoaXMuc291cmNlLnVuc2hpZnQodGhpcy53cmFwKHNvdXJjZSwgbG9jKSk7XHJcbiAgICB9LFxyXG4gICAgcHVzaDogZnVuY3Rpb24oc291cmNlLCBsb2MpIHtcclxuICAgICAgdGhpcy5zb3VyY2UucHVzaCh0aGlzLndyYXAoc291cmNlLCBsb2MpKTtcclxuICAgIH0sXHJcblxyXG4gICAgbWVyZ2U6IGZ1bmN0aW9uKCkge1xyXG4gICAgICB2YXIgc291cmNlID0gdGhpcy5lbXB0eSgpO1xyXG4gICAgICB0aGlzLmVhY2goZnVuY3Rpb24obGluZSkge1xyXG4gICAgICAgIHNvdXJjZS5hZGQoWycgICcsIGxpbmUsICdcXG4nXSk7XHJcbiAgICAgIH0pO1xyXG4gICAgICByZXR1cm4gc291cmNlO1xyXG4gICAgfSxcclxuXHJcbiAgICBlYWNoOiBmdW5jdGlvbihpdGVyKSB7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLnNvdXJjZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgIGl0ZXIodGhpcy5zb3VyY2VbaV0pO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGVtcHR5OiBmdW5jdGlvbihsb2MpIHtcclxuICAgICAgbG9jID0gbG9jIHx8IHRoaXMuY3VycmVudExvY2F0aW9uIHx8IHtzdGFydDp7fX07XHJcbiAgICAgIHJldHVybiBuZXcgU291cmNlTm9kZShsb2Muc3RhcnQubGluZSwgbG9jLnN0YXJ0LmNvbHVtbiwgdGhpcy5zcmNGaWxlKTtcclxuICAgIH0sXHJcbiAgICB3cmFwOiBmdW5jdGlvbihjaHVuaywgbG9jKSB7XHJcbiAgICAgIGlmIChjaHVuayBpbnN0YW5jZW9mIFNvdXJjZU5vZGUpIHtcclxuICAgICAgICByZXR1cm4gY2h1bms7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxvYyA9IGxvYyB8fCB0aGlzLmN1cnJlbnRMb2NhdGlvbiB8fCB7c3RhcnQ6e319O1xyXG4gICAgICBjaHVuayA9IGNhc3RDaHVuayhjaHVuaywgdGhpcywgbG9jKTtcclxuXHJcbiAgICAgIHJldHVybiBuZXcgU291cmNlTm9kZShsb2Muc3RhcnQubGluZSwgbG9jLnN0YXJ0LmNvbHVtbiwgdGhpcy5zcmNGaWxlLCBjaHVuayk7XHJcbiAgICB9LFxyXG5cclxuICAgIGZ1bmN0aW9uQ2FsbDogZnVuY3Rpb24oZm4sIHR5cGUsIHBhcmFtcykge1xyXG4gICAgICBwYXJhbXMgPSB0aGlzLmdlbmVyYXRlTGlzdChwYXJhbXMpO1xyXG4gICAgICByZXR1cm4gdGhpcy53cmFwKFtmbiwgdHlwZSA/ICcuJyArIHR5cGUgKyAnKCcgOiAnKCcsIHBhcmFtcywgJyknXSk7XHJcbiAgICB9LFxyXG5cclxuICAgIHF1b3RlZFN0cmluZzogZnVuY3Rpb24oc3RyKSB7XHJcbiAgICAgIHJldHVybiAnXCInICsgKHN0ciArICcnKVxyXG4gICAgICAgIC5yZXBsYWNlKC9cXFxcL2csICdcXFxcXFxcXCcpXHJcbiAgICAgICAgLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKVxyXG4gICAgICAgIC5yZXBsYWNlKC9cXG4vZywgJ1xcXFxuJylcclxuICAgICAgICAucmVwbGFjZSgvXFxyL2csICdcXFxccicpXHJcbiAgICAgICAgLnJlcGxhY2UoL1xcdTIwMjgvZywgJ1xcXFx1MjAyOCcpICAgLy8gUGVyIEVjbWEtMjYyIDcuMyArIDcuOC40XHJcbiAgICAgICAgLnJlcGxhY2UoL1xcdTIwMjkvZywgJ1xcXFx1MjAyOScpICsgJ1wiJztcclxuICAgIH0sXHJcblxyXG4gICAgb2JqZWN0TGl0ZXJhbDogZnVuY3Rpb24ob2JqKSB7XHJcbiAgICAgIHZhciBwYWlycyA9IFtdO1xyXG5cclxuICAgICAgZm9yICh2YXIga2V5IGluIG9iaikge1xyXG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG4gICAgICAgICAgdmFyIHZhbHVlID0gY2FzdENodW5rKG9ialtrZXldLCB0aGlzKTtcclxuICAgICAgICAgIGlmICh2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgcGFpcnMucHVzaChbdGhpcy5xdW90ZWRTdHJpbmcoa2V5KSwgJzonLCB2YWx1ZV0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIHJldCA9IHRoaXMuZ2VuZXJhdGVMaXN0KHBhaXJzKTtcclxuICAgICAgcmV0LnByZXBlbmQoJ3snKTtcclxuICAgICAgcmV0LmFkZCgnfScpO1xyXG4gICAgICByZXR1cm4gcmV0O1xyXG4gICAgfSxcclxuXHJcblxyXG4gICAgZ2VuZXJhdGVMaXN0OiBmdW5jdGlvbihlbnRyaWVzLCBsb2MpIHtcclxuICAgICAgdmFyIHJldCA9IHRoaXMuZW1wdHkobG9jKTtcclxuXHJcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBlbnRyaWVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgaWYgKGkpIHtcclxuICAgICAgICAgIHJldC5hZGQoJywnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldC5hZGQoY2FzdENodW5rKGVudHJpZXNbaV0sIHRoaXMsIGxvYykpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gcmV0O1xyXG4gICAgfSxcclxuXHJcbiAgICBnZW5lcmF0ZUFycmF5OiBmdW5jdGlvbihlbnRyaWVzLCBsb2MpIHtcclxuICAgICAgdmFyIHJldCA9IHRoaXMuZ2VuZXJhdGVMaXN0KGVudHJpZXMsIGxvYyk7XHJcbiAgICAgIHJldC5wcmVwZW5kKCdbJyk7XHJcbiAgICAgIHJldC5hZGQoJ10nKTtcclxuXHJcbiAgICAgIHJldHVybiByZXQ7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgX19leHBvcnRzX18gPSBDb2RlR2VuO1xyXG4gIHJldHVybiBfX2V4cG9ydHNfXztcclxufSkoX19tb2R1bGUzX18pO1xyXG5cclxuLy8gaGFuZGxlYmFycy9jb21waWxlci9qYXZhc2NyaXB0LWNvbXBpbGVyLmpzXHJcbnZhciBfX21vZHVsZTE0X18gPSAoZnVuY3Rpb24oX19kZXBlbmRlbmN5MV9fLCBfX2RlcGVuZGVuY3kyX18sIF9fZGVwZW5kZW5jeTNfXywgX19kZXBlbmRlbmN5NF9fKSB7XHJcbiAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgdmFyIF9fZXhwb3J0c19fO1xyXG4gIHZhciBDT01QSUxFUl9SRVZJU0lPTiA9IF9fZGVwZW5kZW5jeTFfXy5DT01QSUxFUl9SRVZJU0lPTjtcclxuICB2YXIgUkVWSVNJT05fQ0hBTkdFUyA9IF9fZGVwZW5kZW5jeTFfXy5SRVZJU0lPTl9DSEFOR0VTO1xyXG4gIHZhciBFeGNlcHRpb24gPSBfX2RlcGVuZGVuY3kyX187XHJcbiAgdmFyIGlzQXJyYXkgPSBfX2RlcGVuZGVuY3kzX18uaXNBcnJheTtcclxuICB2YXIgQ29kZUdlbiA9IF9fZGVwZW5kZW5jeTRfXztcclxuXHJcbiAgZnVuY3Rpb24gTGl0ZXJhbCh2YWx1ZSkge1xyXG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gSmF2YVNjcmlwdENvbXBpbGVyKCkge31cclxuXHJcbiAgSmF2YVNjcmlwdENvbXBpbGVyLnByb3RvdHlwZSA9IHtcclxuICAgIC8vIFBVQkxJQyBBUEk6IFlvdSBjYW4gb3ZlcnJpZGUgdGhlc2UgbWV0aG9kcyBpbiBhIHN1YmNsYXNzIHRvIHByb3ZpZGVcclxuICAgIC8vIGFsdGVybmF0aXZlIGNvbXBpbGVkIGZvcm1zIGZvciBuYW1lIGxvb2t1cCBhbmQgYnVmZmVyaW5nIHNlbWFudGljc1xyXG4gICAgbmFtZUxvb2t1cDogZnVuY3Rpb24ocGFyZW50LCBuYW1lIC8qICwgdHlwZSovKSB7XHJcbiAgICAgIGlmIChKYXZhU2NyaXB0Q29tcGlsZXIuaXNWYWxpZEphdmFTY3JpcHRWYXJpYWJsZU5hbWUobmFtZSkpIHtcclxuICAgICAgICByZXR1cm4gW3BhcmVudCwgXCIuXCIsIG5hbWVdO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiBbcGFyZW50LCBcIlsnXCIsIG5hbWUsIFwiJ11cIl07XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBkZXB0aGVkTG9va3VwOiBmdW5jdGlvbihuYW1lKSB7XHJcbiAgICAgIHJldHVybiBbdGhpcy5hbGlhc2FibGUoJ3RoaXMubG9va3VwJyksICcoZGVwdGhzLCBcIicsIG5hbWUsICdcIiknXTtcclxuICAgIH0sXHJcblxyXG4gICAgY29tcGlsZXJJbmZvOiBmdW5jdGlvbigpIHtcclxuICAgICAgdmFyIHJldmlzaW9uID0gQ09NUElMRVJfUkVWSVNJT04sXHJcbiAgICAgICAgICB2ZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbcmV2aXNpb25dO1xyXG4gICAgICByZXR1cm4gW3JldmlzaW9uLCB2ZXJzaW9uc107XHJcbiAgICB9LFxyXG5cclxuICAgIGFwcGVuZFRvQnVmZmVyOiBmdW5jdGlvbihzb3VyY2UsIGxvY2F0aW9uLCBleHBsaWNpdCkge1xyXG4gICAgICAvLyBGb3JjZSBhIHNvdXJjZSBhcyB0aGlzIHNpbXBsaWZpZXMgdGhlIG1lcmdlIGxvZ2ljLlxyXG4gICAgICBpZiAoIWlzQXJyYXkoc291cmNlKSkge1xyXG4gICAgICAgIHNvdXJjZSA9IFtzb3VyY2VdO1xyXG4gICAgICB9XHJcbiAgICAgIHNvdXJjZSA9IHRoaXMuc291cmNlLndyYXAoc291cmNlLCBsb2NhdGlvbik7XHJcblxyXG4gICAgICBpZiAodGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xyXG4gICAgICAgIHJldHVybiBbJ3JldHVybiAnLCBzb3VyY2UsICc7J107XHJcbiAgICAgIH0gZWxzZSBpZiAoZXhwbGljaXQpIHtcclxuICAgICAgICAvLyBUaGlzIGlzIGEgY2FzZSB3aGVyZSB0aGUgYnVmZmVyIG9wZXJhdGlvbiBvY2N1cnMgYXMgYSBjaGlsZCBvZiBhbm90aGVyXHJcbiAgICAgICAgLy8gY29uc3RydWN0LCBnZW5lcmFsbHkgYnJhY2VzLiBXZSBoYXZlIHRvIGV4cGxpY2l0bHkgb3V0cHV0IHRoZXNlIGJ1ZmZlclxyXG4gICAgICAgIC8vIG9wZXJhdGlvbnMgdG8gZW5zdXJlIHRoYXQgdGhlIGVtaXR0ZWQgY29kZSBnb2VzIGluIHRoZSBjb3JyZWN0IGxvY2F0aW9uLlxyXG4gICAgICAgIHJldHVybiBbJ2J1ZmZlciArPSAnLCBzb3VyY2UsICc7J107XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgc291cmNlLmFwcGVuZFRvQnVmZmVyID0gdHJ1ZTtcclxuICAgICAgICByZXR1cm4gc291cmNlO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGluaXRpYWxpemVCdWZmZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICByZXR1cm4gdGhpcy5xdW90ZWRTdHJpbmcoXCJcIik7XHJcbiAgICB9LFxyXG4gICAgLy8gRU5EIFBVQkxJQyBBUElcclxuXHJcbiAgICBjb21waWxlOiBmdW5jdGlvbihlbnZpcm9ubWVudCwgb3B0aW9ucywgY29udGV4dCwgYXNPYmplY3QpIHtcclxuICAgICAgdGhpcy5lbnZpcm9ubWVudCA9IGVudmlyb25tZW50O1xyXG4gICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xyXG4gICAgICB0aGlzLnN0cmluZ1BhcmFtcyA9IHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXM7XHJcbiAgICAgIHRoaXMudHJhY2tJZHMgPSB0aGlzLm9wdGlvbnMudHJhY2tJZHM7XHJcbiAgICAgIHRoaXMucHJlY29tcGlsZSA9ICFhc09iamVjdDtcclxuXHJcbiAgICAgIHRoaXMubmFtZSA9IHRoaXMuZW52aXJvbm1lbnQubmFtZTtcclxuICAgICAgdGhpcy5pc0NoaWxkID0gISFjb250ZXh0O1xyXG4gICAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0IHx8IHtcclxuICAgICAgICBwcm9ncmFtczogW10sXHJcbiAgICAgICAgZW52aXJvbm1lbnRzOiBbXVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdGhpcy5wcmVhbWJsZSgpO1xyXG5cclxuICAgICAgdGhpcy5zdGFja1Nsb3QgPSAwO1xyXG4gICAgICB0aGlzLnN0YWNrVmFycyA9IFtdO1xyXG4gICAgICB0aGlzLmFsaWFzZXMgPSB7fTtcclxuICAgICAgdGhpcy5yZWdpc3RlcnMgPSB7IGxpc3Q6IFtdIH07XHJcbiAgICAgIHRoaXMuaGFzaGVzID0gW107XHJcbiAgICAgIHRoaXMuY29tcGlsZVN0YWNrID0gW107XHJcbiAgICAgIHRoaXMuaW5saW5lU3RhY2sgPSBbXTtcclxuICAgICAgdGhpcy5ibG9ja1BhcmFtcyA9IFtdO1xyXG5cclxuICAgICAgdGhpcy5jb21waWxlQ2hpbGRyZW4oZW52aXJvbm1lbnQsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgdGhpcy51c2VEZXB0aHMgPSB0aGlzLnVzZURlcHRocyB8fCBlbnZpcm9ubWVudC51c2VEZXB0aHMgfHwgdGhpcy5vcHRpb25zLmNvbXBhdDtcclxuICAgICAgdGhpcy51c2VCbG9ja1BhcmFtcyA9IHRoaXMudXNlQmxvY2tQYXJhbXMgfHwgZW52aXJvbm1lbnQudXNlQmxvY2tQYXJhbXM7XHJcblxyXG4gICAgICB2YXIgb3Bjb2RlcyA9IGVudmlyb25tZW50Lm9wY29kZXMsXHJcbiAgICAgICAgICBvcGNvZGUsXHJcbiAgICAgICAgICBmaXJzdExvYyxcclxuICAgICAgICAgIGksXHJcbiAgICAgICAgICBsO1xyXG5cclxuICAgICAgZm9yIChpID0gMCwgbCA9IG9wY29kZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgb3Bjb2RlID0gb3Bjb2Rlc1tpXTtcclxuXHJcbiAgICAgICAgdGhpcy5zb3VyY2UuY3VycmVudExvY2F0aW9uID0gb3Bjb2RlLmxvYztcclxuICAgICAgICBmaXJzdExvYyA9IGZpcnN0TG9jIHx8IG9wY29kZS5sb2M7XHJcbiAgICAgICAgdGhpc1tvcGNvZGUub3Bjb2RlXS5hcHBseSh0aGlzLCBvcGNvZGUuYXJncyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEZsdXNoIGFueSB0cmFpbGluZyBjb250ZW50IHRoYXQgbWlnaHQgYmUgcGVuZGluZy5cclxuICAgICAgdGhpcy5zb3VyY2UuY3VycmVudExvY2F0aW9uID0gZmlyc3RMb2M7XHJcbiAgICAgIHRoaXMucHVzaFNvdXJjZSgnJyk7XHJcblxyXG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICBpZiAodGhpcy5zdGFja1Nsb3QgfHwgdGhpcy5pbmxpbmVTdGFjay5sZW5ndGggfHwgdGhpcy5jb21waWxlU3RhY2subGVuZ3RoKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignQ29tcGlsZSBjb21wbGV0ZWQgd2l0aCBjb250ZW50IGxlZnQgb24gc3RhY2snKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIGZuID0gdGhpcy5jcmVhdGVGdW5jdGlvbkNvbnRleHQoYXNPYmplY3QpO1xyXG4gICAgICBpZiAoIXRoaXMuaXNDaGlsZCkge1xyXG4gICAgICAgIHZhciByZXQgPSB7XHJcbiAgICAgICAgICBjb21waWxlcjogdGhpcy5jb21waWxlckluZm8oKSxcclxuICAgICAgICAgIG1haW46IGZuXHJcbiAgICAgICAgfTtcclxuICAgICAgICB2YXIgcHJvZ3JhbXMgPSB0aGlzLmNvbnRleHQucHJvZ3JhbXM7XHJcbiAgICAgICAgZm9yIChpID0gMCwgbCA9IHByb2dyYW1zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgICAgICAgaWYgKHByb2dyYW1zW2ldKSB7XHJcbiAgICAgICAgICAgIHJldFtpXSA9IHByb2dyYW1zW2ldO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuZW52aXJvbm1lbnQudXNlUGFydGlhbCkge1xyXG4gICAgICAgICAgcmV0LnVzZVBhcnRpYWwgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRhdGEpIHtcclxuICAgICAgICAgIHJldC51c2VEYXRhID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMudXNlRGVwdGhzKSB7XHJcbiAgICAgICAgICByZXQudXNlRGVwdGhzID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMudXNlQmxvY2tQYXJhbXMpIHtcclxuICAgICAgICAgIHJldC51c2VCbG9ja1BhcmFtcyA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuY29tcGF0KSB7XHJcbiAgICAgICAgICByZXQuY29tcGF0ID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghYXNPYmplY3QpIHtcclxuICAgICAgICAgIHJldC5jb21waWxlciA9IEpTT04uc3RyaW5naWZ5KHJldC5jb21waWxlcik7XHJcblxyXG4gICAgICAgICAgdGhpcy5zb3VyY2UuY3VycmVudExvY2F0aW9uID0ge3N0YXJ0OiB7bGluZTogMSwgY29sdW1uOiAwfX07XHJcbiAgICAgICAgICByZXQgPSB0aGlzLm9iamVjdExpdGVyYWwocmV0KTtcclxuXHJcbiAgICAgICAgICBpZiAob3B0aW9ucy5zcmNOYW1lKSB7XHJcbiAgICAgICAgICAgIHJldCA9IHJldC50b1N0cmluZ1dpdGhTb3VyY2VNYXAoe2ZpbGU6IG9wdGlvbnMuZGVzdE5hbWV9KTtcclxuICAgICAgICAgICAgcmV0Lm1hcCA9IHJldC5tYXAgJiYgcmV0Lm1hcC50b1N0cmluZygpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0ID0gcmV0LnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJldC5jb21waWxlck9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiBmbjtcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBwcmVhbWJsZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgIC8vIHRyYWNrIHRoZSBsYXN0IGNvbnRleHQgcHVzaGVkIGludG8gcGxhY2UgdG8gYWxsb3cgc2tpcHBpbmcgdGhlXHJcbiAgICAgIC8vIGdldENvbnRleHQgb3Bjb2RlIHdoZW4gaXQgd291bGQgYmUgYSBub29wXHJcbiAgICAgIHRoaXMubGFzdENvbnRleHQgPSAwO1xyXG4gICAgICB0aGlzLnNvdXJjZSA9IG5ldyBDb2RlR2VuKHRoaXMub3B0aW9ucy5zcmNOYW1lKTtcclxuICAgIH0sXHJcblxyXG4gICAgY3JlYXRlRnVuY3Rpb25Db250ZXh0OiBmdW5jdGlvbihhc09iamVjdCkge1xyXG4gICAgICB2YXIgdmFyRGVjbGFyYXRpb25zID0gJyc7XHJcblxyXG4gICAgICB2YXIgbG9jYWxzID0gdGhpcy5zdGFja1ZhcnMuY29uY2F0KHRoaXMucmVnaXN0ZXJzLmxpc3QpO1xyXG4gICAgICBpZihsb2NhbHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIHZhckRlY2xhcmF0aW9ucyArPSBcIiwgXCIgKyBsb2NhbHMuam9pbihcIiwgXCIpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHZW5lcmF0ZSBtaW5pbWl6ZXIgYWxpYXMgbWFwcGluZ3NcclxuICAgICAgLy9cclxuICAgICAgLy8gV2hlbiB1c2luZyB0cnVlIFNvdXJjZU5vZGVzLCB0aGlzIHdpbGwgdXBkYXRlIGFsbCByZWZlcmVuY2VzIHRvIHRoZSBnaXZlbiBhbGlhc1xyXG4gICAgICAvLyBhcyB0aGUgc291cmNlIG5vZGVzIGFyZSByZXVzZWQgaW4gc2l0dS4gRm9yIHRoZSBub24tc291cmNlIG5vZGUgY29tcGlsYXRpb24gbW9kZSxcclxuICAgICAgLy8gYWxpYXNlcyB3aWxsIG5vdCBiZSB1c2VkLCBidXQgdGhpcyBjYXNlIGlzIGFscmVhZHkgYmVpbmcgcnVuIG9uIHRoZSBjbGllbnQgYW5kXHJcbiAgICAgIC8vIHdlIGFyZW4ndCBjb25jZXJuIGFib3V0IG1pbmltaXppbmcgdGhlIHRlbXBsYXRlIHNpemUuXHJcbiAgICAgIHZhciBhbGlhc0NvdW50ID0gMDtcclxuICAgICAgZm9yICh2YXIgYWxpYXMgaW4gdGhpcy5hbGlhc2VzKSB7XHJcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLmFsaWFzZXNbYWxpYXNdO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5hbGlhc2VzLmhhc093blByb3BlcnR5KGFsaWFzKSAmJiBub2RlLmNoaWxkcmVuICYmIG5vZGUucmVmZXJlbmNlQ291bnQgPiAxKSB7XHJcbiAgICAgICAgICB2YXJEZWNsYXJhdGlvbnMgKz0gJywgYWxpYXMnICsgKCsrYWxpYXNDb3VudCkgKyAnPScgKyBhbGlhcztcclxuICAgICAgICAgIG5vZGUuY2hpbGRyZW5bMF0gPSAnYWxpYXMnICsgYWxpYXNDb3VudDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBwYXJhbXMgPSBbXCJkZXB0aDBcIiwgXCJoZWxwZXJzXCIsIFwicGFydGlhbHNcIiwgXCJkYXRhXCJdO1xyXG5cclxuICAgICAgaWYgKHRoaXMudXNlQmxvY2tQYXJhbXMgfHwgdGhpcy51c2VEZXB0aHMpIHtcclxuICAgICAgICBwYXJhbXMucHVzaCgnYmxvY2tQYXJhbXMnKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAodGhpcy51c2VEZXB0aHMpIHtcclxuICAgICAgICBwYXJhbXMucHVzaCgnZGVwdGhzJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFBlcmZvcm0gYSBzZWNvbmQgcGFzcyBvdmVyIHRoZSBvdXRwdXQgdG8gbWVyZ2UgY29udGVudCB3aGVuIHBvc3NpYmxlXHJcbiAgICAgIHZhciBzb3VyY2UgPSB0aGlzLm1lcmdlU291cmNlKHZhckRlY2xhcmF0aW9ucyk7XHJcblxyXG4gICAgICBpZiAoYXNPYmplY3QpIHtcclxuICAgICAgICBwYXJhbXMucHVzaChzb3VyY2UpO1xyXG5cclxuICAgICAgICByZXR1cm4gRnVuY3Rpb24uYXBwbHkodGhpcywgcGFyYW1zKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zb3VyY2Uud3JhcChbJ2Z1bmN0aW9uKCcsIHBhcmFtcy5qb2luKCcsJyksICcpIHtcXG4gICcsIHNvdXJjZSwgJ30nXSk7XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBtZXJnZVNvdXJjZTogZnVuY3Rpb24odmFyRGVjbGFyYXRpb25zKSB7XHJcbiAgICAgIHZhciBpc1NpbXBsZSA9IHRoaXMuZW52aXJvbm1lbnQuaXNTaW1wbGUsXHJcbiAgICAgICAgICBhcHBlbmRPbmx5ID0gIXRoaXMuZm9yY2VCdWZmZXIsXHJcbiAgICAgICAgICBhcHBlbmRGaXJzdCxcclxuXHJcbiAgICAgICAgICBzb3VyY2VTZWVuLFxyXG4gICAgICAgICAgYnVmZmVyU3RhcnQsXHJcbiAgICAgICAgICBidWZmZXJFbmQ7XHJcbiAgICAgIHRoaXMuc291cmNlLmVhY2goZnVuY3Rpb24obGluZSkge1xyXG4gICAgICAgIGlmIChsaW5lLmFwcGVuZFRvQnVmZmVyKSB7XHJcbiAgICAgICAgICBpZiAoYnVmZmVyU3RhcnQpIHtcclxuICAgICAgICAgICAgbGluZS5wcmVwZW5kKCcgICsgJyk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBidWZmZXJTdGFydCA9IGxpbmU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBidWZmZXJFbmQgPSBsaW5lO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBpZiAoYnVmZmVyU3RhcnQpIHtcclxuICAgICAgICAgICAgaWYgKCFzb3VyY2VTZWVuKSB7XHJcbiAgICAgICAgICAgICAgYXBwZW5kRmlyc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGJ1ZmZlclN0YXJ0LnByZXBlbmQoJ2J1ZmZlciArPSAnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBidWZmZXJFbmQuYWRkKCc7Jyk7XHJcbiAgICAgICAgICAgIGJ1ZmZlclN0YXJ0ID0gYnVmZmVyRW5kID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHNvdXJjZVNlZW4gPSB0cnVlO1xyXG4gICAgICAgICAgaWYgKCFpc1NpbXBsZSkge1xyXG4gICAgICAgICAgICBhcHBlbmRPbmx5ID0gZmFsc2U7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcblxyXG4gICAgICBpZiAoYXBwZW5kT25seSkge1xyXG4gICAgICAgIGlmIChidWZmZXJTdGFydCkge1xyXG4gICAgICAgICAgYnVmZmVyU3RhcnQucHJlcGVuZCgncmV0dXJuICcpO1xyXG4gICAgICAgICAgYnVmZmVyRW5kLmFkZCgnOycpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoIXNvdXJjZVNlZW4pIHtcclxuICAgICAgICAgIHRoaXMuc291cmNlLnB1c2goJ3JldHVybiBcIlwiOycpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB2YXJEZWNsYXJhdGlvbnMgKz0gXCIsIGJ1ZmZlciA9IFwiICsgKGFwcGVuZEZpcnN0ID8gJycgOiB0aGlzLmluaXRpYWxpemVCdWZmZXIoKSk7XHJcblxyXG4gICAgICAgIGlmIChidWZmZXJTdGFydCkge1xyXG4gICAgICAgICAgYnVmZmVyU3RhcnQucHJlcGVuZCgncmV0dXJuIGJ1ZmZlciArICcpO1xyXG4gICAgICAgICAgYnVmZmVyRW5kLmFkZCgnOycpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLnNvdXJjZS5wdXNoKCdyZXR1cm4gYnVmZmVyOycpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHZhckRlY2xhcmF0aW9ucykge1xyXG4gICAgICAgIHRoaXMuc291cmNlLnByZXBlbmQoJ3ZhciAnICsgdmFyRGVjbGFyYXRpb25zLnN1YnN0cmluZygyKSArIChhcHBlbmRGaXJzdCA/ICcnIDogJztcXG4nKSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS5tZXJnZSgpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBbYmxvY2tWYWx1ZV1cclxuICAgIC8vXHJcbiAgICAvLyBPbiBzdGFjaywgYmVmb3JlOiBoYXNoLCBpbnZlcnNlLCBwcm9ncmFtLCB2YWx1ZVxyXG4gICAgLy8gT24gc3RhY2ssIGFmdGVyOiByZXR1cm4gdmFsdWUgb2YgYmxvY2tIZWxwZXJNaXNzaW5nXHJcbiAgICAvL1xyXG4gICAgLy8gVGhlIHB1cnBvc2Ugb2YgdGhpcyBvcGNvZGUgaXMgdG8gdGFrZSBhIGJsb2NrIG9mIHRoZSBmb3JtXHJcbiAgICAvLyBge3sjdGhpcy5mb299fS4uLnt7L3RoaXMuZm9vfX1gLCByZXNvbHZlIHRoZSB2YWx1ZSBvZiBgZm9vYCwgYW5kXHJcbiAgICAvLyByZXBsYWNlIGl0IG9uIHRoZSBzdGFjayB3aXRoIHRoZSByZXN1bHQgb2YgcHJvcGVybHlcclxuICAgIC8vIGludm9raW5nIGJsb2NrSGVscGVyTWlzc2luZy5cclxuICAgIGJsb2NrVmFsdWU6IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgdmFyIGJsb2NrSGVscGVyTWlzc2luZyA9IHRoaXMuYWxpYXNhYmxlKCdoZWxwZXJzLmJsb2NrSGVscGVyTWlzc2luZycpLFxyXG4gICAgICAgICAgcGFyYW1zID0gW3RoaXMuY29udGV4dE5hbWUoMCldO1xyXG4gICAgICB0aGlzLnNldHVwSGVscGVyQXJncyhuYW1lLCAwLCBwYXJhbXMpO1xyXG5cclxuICAgICAgdmFyIGJsb2NrTmFtZSA9IHRoaXMucG9wU3RhY2soKTtcclxuICAgICAgcGFyYW1zLnNwbGljZSgxLCAwLCBibG9ja05hbWUpO1xyXG5cclxuICAgICAgdGhpcy5wdXNoKHRoaXMuc291cmNlLmZ1bmN0aW9uQ2FsbChibG9ja0hlbHBlck1pc3NpbmcsICdjYWxsJywgcGFyYW1zKSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFthbWJpZ3VvdXNCbG9ja1ZhbHVlXVxyXG4gICAgLy9cclxuICAgIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHZhbHVlXHJcbiAgICAvLyBDb21waWxlciB2YWx1ZSwgYmVmb3JlOiBsYXN0SGVscGVyPXZhbHVlIG9mIGxhc3QgZm91bmQgaGVscGVyLCBpZiBhbnlcclxuICAgIC8vIE9uIHN0YWNrLCBhZnRlciwgaWYgbm8gbGFzdEhlbHBlcjogc2FtZSBhcyBbYmxvY2tWYWx1ZV1cclxuICAgIC8vIE9uIHN0YWNrLCBhZnRlciwgaWYgbGFzdEhlbHBlcjogdmFsdWVcclxuICAgIGFtYmlndW91c0Jsb2NrVmFsdWU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAvLyBXZSdyZSBiZWluZyBhIGJpdCBjaGVla3kgYW5kIHJldXNpbmcgdGhlIG9wdGlvbnMgdmFsdWUgZnJvbSB0aGUgcHJpb3IgZXhlY1xyXG4gICAgICB2YXIgYmxvY2tIZWxwZXJNaXNzaW5nID0gdGhpcy5hbGlhc2FibGUoJ2hlbHBlcnMuYmxvY2tIZWxwZXJNaXNzaW5nJyksXHJcbiAgICAgICAgICBwYXJhbXMgPSBbdGhpcy5jb250ZXh0TmFtZSgwKV07XHJcbiAgICAgIHRoaXMuc2V0dXBIZWxwZXJBcmdzKCcnLCAwLCBwYXJhbXMsIHRydWUpO1xyXG5cclxuICAgICAgdGhpcy5mbHVzaElubGluZSgpO1xyXG5cclxuICAgICAgdmFyIGN1cnJlbnQgPSB0aGlzLnRvcFN0YWNrKCk7XHJcbiAgICAgIHBhcmFtcy5zcGxpY2UoMSwgMCwgY3VycmVudCk7XHJcblxyXG4gICAgICB0aGlzLnB1c2hTb3VyY2UoW1xyXG4gICAgICAgICAgJ2lmICghJywgdGhpcy5sYXN0SGVscGVyLCAnKSB7ICcsXHJcbiAgICAgICAgICAgIGN1cnJlbnQsICcgPSAnLCB0aGlzLnNvdXJjZS5mdW5jdGlvbkNhbGwoYmxvY2tIZWxwZXJNaXNzaW5nLCAnY2FsbCcsIHBhcmFtcyksXHJcbiAgICAgICAgICAnfSddKTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gW2FwcGVuZENvbnRlbnRdXHJcbiAgICAvL1xyXG4gICAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXHJcbiAgICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxyXG4gICAgLy9cclxuICAgIC8vIEFwcGVuZHMgdGhlIHN0cmluZyB2YWx1ZSBvZiBgY29udGVudGAgdG8gdGhlIGN1cnJlbnQgYnVmZmVyXHJcbiAgICBhcHBlbmRDb250ZW50OiBmdW5jdGlvbihjb250ZW50KSB7XHJcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdDb250ZW50KSB7XHJcbiAgICAgICAgY29udGVudCA9IHRoaXMucGVuZGluZ0NvbnRlbnQgKyBjb250ZW50O1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMucGVuZGluZ0xvY2F0aW9uID0gdGhpcy5zb3VyY2UuY3VycmVudExvY2F0aW9uO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnBlbmRpbmdDb250ZW50ID0gY29udGVudDtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gW2FwcGVuZF1cclxuICAgIC8vXHJcbiAgICAvLyBPbiBzdGFjaywgYmVmb3JlOiB2YWx1ZSwgLi4uXHJcbiAgICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxyXG4gICAgLy9cclxuICAgIC8vIENvZXJjZXMgYHZhbHVlYCB0byBhIFN0cmluZyBhbmQgYXBwZW5kcyBpdCB0byB0aGUgY3VycmVudCBidWZmZXIuXHJcbiAgICAvL1xyXG4gICAgLy8gSWYgYHZhbHVlYCBpcyB0cnV0aHksIG9yIDAsIGl0IGlzIGNvZXJjZWQgaW50byBhIHN0cmluZyBhbmQgYXBwZW5kZWRcclxuICAgIC8vIE90aGVyd2lzZSwgdGhlIGVtcHR5IHN0cmluZyBpcyBhcHBlbmRlZFxyXG4gICAgYXBwZW5kOiBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKHRoaXMuaXNJbmxpbmUoKSkge1xyXG4gICAgICAgIHRoaXMucmVwbGFjZVN0YWNrKGZ1bmN0aW9uKGN1cnJlbnQpIHtcclxuICAgICAgICAgIHJldHVybiBbJyAhPSBudWxsID8gJywgY3VycmVudCwgJyA6IFwiXCInXTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5wdXNoU291cmNlKHRoaXMuYXBwZW5kVG9CdWZmZXIodGhpcy5wb3BTdGFjaygpKSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFyIGxvY2FsID0gdGhpcy5wb3BTdGFjaygpO1xyXG4gICAgICAgIHRoaXMucHVzaFNvdXJjZShbJ2lmICgnLCBsb2NhbCwgJyAhPSBudWxsKSB7ICcsIHRoaXMuYXBwZW5kVG9CdWZmZXIobG9jYWwsIHVuZGVmaW5lZCwgdHJ1ZSksICcgfSddKTtcclxuICAgICAgICBpZiAodGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xyXG4gICAgICAgICAgdGhpcy5wdXNoU291cmNlKFsnZWxzZSB7ICcsIHRoaXMuYXBwZW5kVG9CdWZmZXIoXCInJ1wiLCB1bmRlZmluZWQsIHRydWUpLCAnIH0nXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFthcHBlbmRFc2NhcGVkXVxyXG4gICAgLy9cclxuICAgIC8vIE9uIHN0YWNrLCBiZWZvcmU6IHZhbHVlLCAuLi5cclxuICAgIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uXHJcbiAgICAvL1xyXG4gICAgLy8gRXNjYXBlIGB2YWx1ZWAgYW5kIGFwcGVuZCBpdCB0byB0aGUgYnVmZmVyXHJcbiAgICBhcHBlbmRFc2NhcGVkOiBmdW5jdGlvbigpIHtcclxuICAgICAgdGhpcy5wdXNoU291cmNlKHRoaXMuYXBwZW5kVG9CdWZmZXIoXHJcbiAgICAgICAgICBbdGhpcy5hbGlhc2FibGUoJ3RoaXMuZXNjYXBlRXhwcmVzc2lvbicpLCAnKCcsIHRoaXMucG9wU3RhY2soKSwgJyknXSkpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBbZ2V0Q29udGV4dF1cclxuICAgIC8vXHJcbiAgICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cclxuICAgIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uXHJcbiAgICAvLyBDb21waWxlciB2YWx1ZSwgYWZ0ZXI6IGxhc3RDb250ZXh0PWRlcHRoXHJcbiAgICAvL1xyXG4gICAgLy8gU2V0IHRoZSB2YWx1ZSBvZiB0aGUgYGxhc3RDb250ZXh0YCBjb21waWxlciB2YWx1ZSB0byB0aGUgZGVwdGhcclxuICAgIGdldENvbnRleHQ6IGZ1bmN0aW9uKGRlcHRoKSB7XHJcbiAgICAgIHRoaXMubGFzdENvbnRleHQgPSBkZXB0aDtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gW3B1c2hDb250ZXh0XVxyXG4gICAgLy9cclxuICAgIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxyXG4gICAgLy8gT24gc3RhY2ssIGFmdGVyOiBjdXJyZW50Q29udGV4dCwgLi4uXHJcbiAgICAvL1xyXG4gICAgLy8gUHVzaGVzIHRoZSB2YWx1ZSBvZiB0aGUgY3VycmVudCBjb250ZXh0IG9udG8gdGhlIHN0YWNrLlxyXG4gICAgcHVzaENvbnRleHQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwodGhpcy5jb250ZXh0TmFtZSh0aGlzLmxhc3RDb250ZXh0KSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFtsb29rdXBPbkNvbnRleHRdXHJcbiAgICAvL1xyXG4gICAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXHJcbiAgICAvLyBPbiBzdGFjaywgYWZ0ZXI6IGN1cnJlbnRDb250ZXh0W25hbWVdLCAuLi5cclxuICAgIC8vXHJcbiAgICAvLyBMb29rcyB1cCB0aGUgdmFsdWUgb2YgYG5hbWVgIG9uIHRoZSBjdXJyZW50IGNvbnRleHQgYW5kIHB1c2hlc1xyXG4gICAgLy8gaXQgb250byB0aGUgc3RhY2suXHJcbiAgICBsb29rdXBPbkNvbnRleHQ6IGZ1bmN0aW9uKHBhcnRzLCBmYWxzeSwgc2NvcGVkKSB7XHJcbiAgICAgIHZhciBpID0gMDtcclxuXHJcbiAgICAgIGlmICghc2NvcGVkICYmIHRoaXMub3B0aW9ucy5jb21wYXQgJiYgIXRoaXMubGFzdENvbnRleHQpIHtcclxuICAgICAgICAvLyBUaGUgZGVwdGhlZCBxdWVyeSBpcyBleHBlY3RlZCB0byBoYW5kbGUgdGhlIHVuZGVmaW5lZCBsb2dpYyBmb3IgdGhlIHJvb3QgbGV2ZWwgdGhhdFxyXG4gICAgICAgIC8vIGlzIGltcGxlbWVudGVkIGJlbG93LCBzbyB3ZSBldmFsdWF0ZSB0aGF0IGRpcmVjdGx5IGluIGNvbXBhdCBtb2RlXHJcbiAgICAgICAgdGhpcy5wdXNoKHRoaXMuZGVwdGhlZExvb2t1cChwYXJ0c1tpKytdKSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5wdXNoQ29udGV4dCgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnJlc29sdmVQYXRoKCdjb250ZXh0JywgcGFydHMsIGksIGZhbHN5KTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gW2xvb2t1cEJsb2NrUGFyYW1dXHJcbiAgICAvL1xyXG4gICAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXHJcbiAgICAvLyBPbiBzdGFjaywgYWZ0ZXI6IGJsb2NrUGFyYW1bbmFtZV0sIC4uLlxyXG4gICAgLy9cclxuICAgIC8vIExvb2tzIHVwIHRoZSB2YWx1ZSBvZiBgcGFydHNgIG9uIHRoZSBnaXZlbiBibG9jayBwYXJhbSBhbmQgcHVzaGVzXHJcbiAgICAvLyBpdCBvbnRvIHRoZSBzdGFjay5cclxuICAgIGxvb2t1cEJsb2NrUGFyYW06IGZ1bmN0aW9uKGJsb2NrUGFyYW1JZCwgcGFydHMpIHtcclxuICAgICAgdGhpcy51c2VCbG9ja1BhcmFtcyA9IHRydWU7XHJcblxyXG4gICAgICB0aGlzLnB1c2goWydibG9ja1BhcmFtc1snLCBibG9ja1BhcmFtSWRbMF0sICddWycsIGJsb2NrUGFyYW1JZFsxXSwgJ10nXSk7XHJcbiAgICAgIHRoaXMucmVzb2x2ZVBhdGgoJ2NvbnRleHQnLCBwYXJ0cywgMSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFtsb29rdXBEYXRhXVxyXG4gICAgLy9cclxuICAgIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxyXG4gICAgLy8gT24gc3RhY2ssIGFmdGVyOiBkYXRhLCAuLi5cclxuICAgIC8vXHJcbiAgICAvLyBQdXNoIHRoZSBkYXRhIGxvb2t1cCBvcGVyYXRvclxyXG4gICAgbG9va3VwRGF0YTogZnVuY3Rpb24oZGVwdGgsIHBhcnRzKSB7XHJcbiAgICAgIC8qanNoaW50IC1XMDgzICovXHJcbiAgICAgIGlmICghZGVwdGgpIHtcclxuICAgICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ2RhdGEnKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ3RoaXMuZGF0YShkYXRhLCAnICsgZGVwdGggKyAnKScpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnJlc29sdmVQYXRoKCdkYXRhJywgcGFydHMsIDAsIHRydWUpO1xyXG4gICAgfSxcclxuXHJcbiAgICByZXNvbHZlUGF0aDogZnVuY3Rpb24odHlwZSwgcGFydHMsIGksIGZhbHN5KSB7XHJcbiAgICAgIC8qanNoaW50IC1XMDgzICovXHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0IHx8IHRoaXMub3B0aW9ucy5hc3N1bWVPYmplY3RzKSB7XHJcbiAgICAgICAgdGhpcy5wdXNoKHN0cmljdExvb2t1cCh0aGlzLm9wdGlvbnMuc3RyaWN0LCB0aGlzLCBwYXJ0cywgdHlwZSkpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIGxlbiA9IHBhcnRzLmxlbmd0aDtcclxuICAgICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgIHRoaXMucmVwbGFjZVN0YWNrKGZ1bmN0aW9uKGN1cnJlbnQpIHtcclxuICAgICAgICAgIHZhciBsb29rdXAgPSB0aGlzLm5hbWVMb29rdXAoY3VycmVudCwgcGFydHNbaV0sIHR5cGUpO1xyXG4gICAgICAgICAgLy8gV2Ugd2FudCB0byBlbnN1cmUgdGhhdCB6ZXJvIGFuZCBmYWxzZSBhcmUgaGFuZGxlZCBwcm9wZXJseSBpZiB0aGUgY29udGV4dCAoZmFsc3kgZmxhZylcclxuICAgICAgICAgIC8vIG5lZWRzIHRvIGhhdmUgdGhlIHNwZWNpYWwgaGFuZGxpbmcgZm9yIHRoZXNlIHZhbHVlcy5cclxuICAgICAgICAgIGlmICghZmFsc3kpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFsnICE9IG51bGwgPyAnLCBsb29rdXAsICcgOiAnLCBjdXJyZW50XTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIE90aGVyd2lzZSB3ZSBjYW4gdXNlIGdlbmVyaWMgZmFsc3kgaGFuZGxpbmdcclxuICAgICAgICAgICAgcmV0dXJuIFsnICYmICcsIGxvb2t1cF07XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLy8gW3Jlc29sdmVQb3NzaWJsZUxhbWJkYV1cclxuICAgIC8vXHJcbiAgICAvLyBPbiBzdGFjaywgYmVmb3JlOiB2YWx1ZSwgLi4uXHJcbiAgICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHJlc29sdmVkIHZhbHVlLCAuLi5cclxuICAgIC8vXHJcbiAgICAvLyBJZiB0aGUgYHZhbHVlYCBpcyBhIGxhbWJkYSwgcmVwbGFjZSBpdCBvbiB0aGUgc3RhY2sgYnlcclxuICAgIC8vIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGxhbWJkYVxyXG4gICAgcmVzb2x2ZVBvc3NpYmxlTGFtYmRhOiBmdW5jdGlvbigpIHtcclxuICAgICAgdGhpcy5wdXNoKFt0aGlzLmFsaWFzYWJsZSgndGhpcy5sYW1iZGEnKSwgJygnLCB0aGlzLnBvcFN0YWNrKCksICcsICcsIHRoaXMuY29udGV4dE5hbWUoMCksICcpJ10pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBbcHVzaFN0cmluZ1BhcmFtXVxyXG4gICAgLy9cclxuICAgIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxyXG4gICAgLy8gT24gc3RhY2ssIGFmdGVyOiBzdHJpbmcsIGN1cnJlbnRDb250ZXh0LCAuLi5cclxuICAgIC8vXHJcbiAgICAvLyBUaGlzIG9wY29kZSBpcyBkZXNpZ25lZCBmb3IgdXNlIGluIHN0cmluZyBtb2RlLCB3aGljaFxyXG4gICAgLy8gcHJvdmlkZXMgdGhlIHN0cmluZyB2YWx1ZSBvZiBhIHBhcmFtZXRlciBhbG9uZyB3aXRoIGl0c1xyXG4gICAgLy8gZGVwdGggcmF0aGVyIHRoYW4gcmVzb2x2aW5nIGl0IGltbWVkaWF0ZWx5LlxyXG4gICAgcHVzaFN0cmluZ1BhcmFtOiBmdW5jdGlvbihzdHJpbmcsIHR5cGUpIHtcclxuICAgICAgdGhpcy5wdXNoQ29udGV4dCgpO1xyXG4gICAgICB0aGlzLnB1c2hTdHJpbmcodHlwZSk7XHJcblxyXG4gICAgICAvLyBJZiBpdCdzIGEgc3ViZXhwcmVzc2lvbiwgdGhlIHN0cmluZyByZXN1bHRcclxuICAgICAgLy8gd2lsbCBiZSBwdXNoZWQgYWZ0ZXIgdGhpcyBvcGNvZGUuXHJcbiAgICAgIGlmICh0eXBlICE9PSAnU3ViRXhwcmVzc2lvbicpIHtcclxuICAgICAgICBpZiAodHlwZW9mIHN0cmluZyA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgIHRoaXMucHVzaFN0cmluZyhzdHJpbmcpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoc3RyaW5nKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgZW1wdHlIYXNoOiBmdW5jdGlvbihvbWl0RW1wdHkpIHtcclxuICAgICAgaWYgKHRoaXMudHJhY2tJZHMpIHtcclxuICAgICAgICB0aGlzLnB1c2goJ3t9Jyk7IC8vIGhhc2hJZHNcclxuICAgICAgfVxyXG4gICAgICBpZiAodGhpcy5zdHJpbmdQYXJhbXMpIHtcclxuICAgICAgICB0aGlzLnB1c2goJ3t9Jyk7IC8vIGhhc2hDb250ZXh0c1xyXG4gICAgICAgIHRoaXMucHVzaCgne30nKTsgLy8gaGFzaFR5cGVzXHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKG9taXRFbXB0eSA/ICd1bmRlZmluZWQnIDogJ3t9Jyk7XHJcbiAgICB9LFxyXG4gICAgcHVzaEhhc2g6IGZ1bmN0aW9uKCkge1xyXG4gICAgICBpZiAodGhpcy5oYXNoKSB7XHJcbiAgICAgICAgdGhpcy5oYXNoZXMucHVzaCh0aGlzLmhhc2gpO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuaGFzaCA9IHt2YWx1ZXM6IFtdLCB0eXBlczogW10sIGNvbnRleHRzOiBbXSwgaWRzOiBbXX07XHJcbiAgICB9LFxyXG4gICAgcG9wSGFzaDogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZhciBoYXNoID0gdGhpcy5oYXNoO1xyXG4gICAgICB0aGlzLmhhc2ggPSB0aGlzLmhhc2hlcy5wb3AoKTtcclxuXHJcbiAgICAgIGlmICh0aGlzLnRyYWNrSWRzKSB7XHJcbiAgICAgICAgdGhpcy5wdXNoKHRoaXMub2JqZWN0TGl0ZXJhbChoYXNoLmlkcykpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh0aGlzLnN0cmluZ1BhcmFtcykge1xyXG4gICAgICAgIHRoaXMucHVzaCh0aGlzLm9iamVjdExpdGVyYWwoaGFzaC5jb250ZXh0cykpO1xyXG4gICAgICAgIHRoaXMucHVzaCh0aGlzLm9iamVjdExpdGVyYWwoaGFzaC50eXBlcykpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnB1c2godGhpcy5vYmplY3RMaXRlcmFsKGhhc2gudmFsdWVzKSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFtwdXNoU3RyaW5nXVxyXG4gICAgLy9cclxuICAgIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxyXG4gICAgLy8gT24gc3RhY2ssIGFmdGVyOiBxdW90ZWRTdHJpbmcoc3RyaW5nKSwgLi4uXHJcbiAgICAvL1xyXG4gICAgLy8gUHVzaCBhIHF1b3RlZCB2ZXJzaW9uIG9mIGBzdHJpbmdgIG9udG8gdGhlIHN0YWNrXHJcbiAgICBwdXNoU3RyaW5nOiBmdW5jdGlvbihzdHJpbmcpIHtcclxuICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKHRoaXMucXVvdGVkU3RyaW5nKHN0cmluZykpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBbcHVzaExpdGVyYWxdXHJcbiAgICAvL1xyXG4gICAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXHJcbiAgICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHZhbHVlLCAuLi5cclxuICAgIC8vXHJcbiAgICAvLyBQdXNoZXMgYSB2YWx1ZSBvbnRvIHRoZSBzdGFjay4gVGhpcyBvcGVyYXRpb24gcHJldmVudHNcclxuICAgIC8vIHRoZSBjb21waWxlciBmcm9tIGNyZWF0aW5nIGEgdGVtcG9yYXJ5IHZhcmlhYmxlIHRvIGhvbGRcclxuICAgIC8vIGl0LlxyXG4gICAgcHVzaExpdGVyYWw6IGZ1bmN0aW9uKHZhbHVlKSB7XHJcbiAgICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCh2YWx1ZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFtwdXNoUHJvZ3JhbV1cclxuICAgIC8vXHJcbiAgICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cclxuICAgIC8vIE9uIHN0YWNrLCBhZnRlcjogcHJvZ3JhbShndWlkKSwgLi4uXHJcbiAgICAvL1xyXG4gICAgLy8gUHVzaCBhIHByb2dyYW0gZXhwcmVzc2lvbiBvbnRvIHRoZSBzdGFjay4gVGhpcyB0YWtlc1xyXG4gICAgLy8gYSBjb21waWxlLXRpbWUgZ3VpZCBhbmQgY29udmVydHMgaXQgaW50byBhIHJ1bnRpbWUtYWNjZXNzaWJsZVxyXG4gICAgLy8gZXhwcmVzc2lvbi5cclxuICAgIHB1c2hQcm9ncmFtOiBmdW5jdGlvbihndWlkKSB7XHJcbiAgICAgIGlmIChndWlkICE9IG51bGwpIHtcclxuICAgICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwodGhpcy5wcm9ncmFtRXhwcmVzc2lvbihndWlkKSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKG51bGwpO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFtpbnZva2VIZWxwZXJdXHJcbiAgICAvL1xyXG4gICAgLy8gT24gc3RhY2ssIGJlZm9yZTogaGFzaCwgaW52ZXJzZSwgcHJvZ3JhbSwgcGFyYW1zLi4uLCAuLi5cclxuICAgIC8vIE9uIHN0YWNrLCBhZnRlcjogcmVzdWx0IG9mIGhlbHBlciBpbnZvY2F0aW9uXHJcbiAgICAvL1xyXG4gICAgLy8gUG9wcyBvZmYgdGhlIGhlbHBlcidzIHBhcmFtZXRlcnMsIGludm9rZXMgdGhlIGhlbHBlcixcclxuICAgIC8vIGFuZCBwdXNoZXMgdGhlIGhlbHBlcidzIHJldHVybiB2YWx1ZSBvbnRvIHRoZSBzdGFjay5cclxuICAgIC8vXHJcbiAgICAvLyBJZiB0aGUgaGVscGVyIGlzIG5vdCBmb3VuZCwgYGhlbHBlck1pc3NpbmdgIGlzIGNhbGxlZC5cclxuICAgIGludm9rZUhlbHBlcjogZnVuY3Rpb24ocGFyYW1TaXplLCBuYW1lLCBpc1NpbXBsZSkge1xyXG4gICAgICB2YXIgbm9uSGVscGVyID0gdGhpcy5wb3BTdGFjaygpO1xyXG4gICAgICB2YXIgaGVscGVyID0gdGhpcy5zZXR1cEhlbHBlcihwYXJhbVNpemUsIG5hbWUpO1xyXG4gICAgICB2YXIgc2ltcGxlID0gaXNTaW1wbGUgPyBbaGVscGVyLm5hbWUsICcgfHwgJ10gOiAnJztcclxuXHJcbiAgICAgIHZhciBsb29rdXAgPSBbJygnXS5jb25jYXQoc2ltcGxlLCBub25IZWxwZXIpO1xyXG4gICAgICBpZiAoIXRoaXMub3B0aW9ucy5zdHJpY3QpIHtcclxuICAgICAgICBsb29rdXAucHVzaCgnIHx8ICcsIHRoaXMuYWxpYXNhYmxlKCdoZWxwZXJzLmhlbHBlck1pc3NpbmcnKSk7XHJcbiAgICAgIH1cclxuICAgICAgbG9va3VwLnB1c2goJyknKTtcclxuXHJcbiAgICAgIHRoaXMucHVzaCh0aGlzLnNvdXJjZS5mdW5jdGlvbkNhbGwobG9va3VwLCAnY2FsbCcsIGhlbHBlci5jYWxsUGFyYW1zKSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFtpbnZva2VLbm93bkhlbHBlcl1cclxuICAgIC8vXHJcbiAgICAvLyBPbiBzdGFjaywgYmVmb3JlOiBoYXNoLCBpbnZlcnNlLCBwcm9ncmFtLCBwYXJhbXMuLi4sIC4uLlxyXG4gICAgLy8gT24gc3RhY2ssIGFmdGVyOiByZXN1bHQgb2YgaGVscGVyIGludm9jYXRpb25cclxuICAgIC8vXHJcbiAgICAvLyBUaGlzIG9wZXJhdGlvbiBpcyB1c2VkIHdoZW4gdGhlIGhlbHBlciBpcyBrbm93biB0byBleGlzdCxcclxuICAgIC8vIHNvIGEgYGhlbHBlck1pc3NpbmdgIGZhbGxiYWNrIGlzIG5vdCByZXF1aXJlZC5cclxuICAgIGludm9rZUtub3duSGVscGVyOiBmdW5jdGlvbihwYXJhbVNpemUsIG5hbWUpIHtcclxuICAgICAgdmFyIGhlbHBlciA9IHRoaXMuc2V0dXBIZWxwZXIocGFyYW1TaXplLCBuYW1lKTtcclxuICAgICAgdGhpcy5wdXNoKHRoaXMuc291cmNlLmZ1bmN0aW9uQ2FsbChoZWxwZXIubmFtZSwgJ2NhbGwnLCBoZWxwZXIuY2FsbFBhcmFtcykpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBbaW52b2tlQW1iaWd1b3VzXVxyXG4gICAgLy9cclxuICAgIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHBhcmFtcy4uLiwgLi4uXHJcbiAgICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHJlc3VsdCBvZiBkaXNhbWJpZ3VhdGlvblxyXG4gICAgLy9cclxuICAgIC8vIFRoaXMgb3BlcmF0aW9uIGlzIHVzZWQgd2hlbiBhbiBleHByZXNzaW9uIGxpa2UgYHt7Zm9vfX1gXHJcbiAgICAvLyBpcyBwcm92aWRlZCwgYnV0IHdlIGRvbid0IGtub3cgYXQgY29tcGlsZS10aW1lIHdoZXRoZXIgaXRcclxuICAgIC8vIGlzIGEgaGVscGVyIG9yIGEgcGF0aC5cclxuICAgIC8vXHJcbiAgICAvLyBUaGlzIG9wZXJhdGlvbiBlbWl0cyBtb3JlIGNvZGUgdGhhbiB0aGUgb3RoZXIgb3B0aW9ucyxcclxuICAgIC8vIGFuZCBjYW4gYmUgYXZvaWRlZCBieSBwYXNzaW5nIHRoZSBga25vd25IZWxwZXJzYCBhbmRcclxuICAgIC8vIGBrbm93bkhlbHBlcnNPbmx5YCBmbGFncyBhdCBjb21waWxlLXRpbWUuXHJcbiAgICBpbnZva2VBbWJpZ3VvdXM6IGZ1bmN0aW9uKG5hbWUsIGhlbHBlckNhbGwpIHtcclxuICAgICAgdGhpcy51c2VSZWdpc3RlcignaGVscGVyJyk7XHJcblxyXG4gICAgICB2YXIgbm9uSGVscGVyID0gdGhpcy5wb3BTdGFjaygpO1xyXG5cclxuICAgICAgdGhpcy5lbXB0eUhhc2goKTtcclxuICAgICAgdmFyIGhlbHBlciA9IHRoaXMuc2V0dXBIZWxwZXIoMCwgbmFtZSwgaGVscGVyQ2FsbCk7XHJcblxyXG4gICAgICB2YXIgaGVscGVyTmFtZSA9IHRoaXMubGFzdEhlbHBlciA9IHRoaXMubmFtZUxvb2t1cCgnaGVscGVycycsIG5hbWUsICdoZWxwZXInKTtcclxuXHJcbiAgICAgIHZhciBsb29rdXAgPSBbJygnLCAnKGhlbHBlciA9ICcsIGhlbHBlck5hbWUsICcgfHwgJywgbm9uSGVscGVyLCAnKSddO1xyXG4gICAgICBpZiAoIXRoaXMub3B0aW9ucy5zdHJpY3QpIHtcclxuICAgICAgICBsb29rdXBbMF0gPSAnKGhlbHBlciA9ICc7XHJcbiAgICAgICAgbG9va3VwLnB1c2goXHJcbiAgICAgICAgICAnICE9IG51bGwgPyBoZWxwZXIgOiAnLFxyXG4gICAgICAgICAgdGhpcy5hbGlhc2FibGUoJ2hlbHBlcnMuaGVscGVyTWlzc2luZycpXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5wdXNoKFtcclxuICAgICAgICAgICcoJywgbG9va3VwLFxyXG4gICAgICAgICAgKGhlbHBlci5wYXJhbXNJbml0ID8gWycpLCgnLCBoZWxwZXIucGFyYW1zSW5pdF0gOiBbXSksICcpLCcsXHJcbiAgICAgICAgICAnKHR5cGVvZiBoZWxwZXIgPT09ICcsIHRoaXMuYWxpYXNhYmxlKCdcImZ1bmN0aW9uXCInKSwgJyA/ICcsXHJcbiAgICAgICAgICB0aGlzLnNvdXJjZS5mdW5jdGlvbkNhbGwoJ2hlbHBlcicsJ2NhbGwnLCBoZWxwZXIuY2FsbFBhcmFtcyksICcgOiBoZWxwZXIpKSdcclxuICAgICAgXSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFtpbnZva2VQYXJ0aWFsXVxyXG4gICAgLy9cclxuICAgIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGNvbnRleHQsIC4uLlxyXG4gICAgLy8gT24gc3RhY2sgYWZ0ZXI6IHJlc3VsdCBvZiBwYXJ0aWFsIGludm9jYXRpb25cclxuICAgIC8vXHJcbiAgICAvLyBUaGlzIG9wZXJhdGlvbiBwb3BzIG9mZiBhIGNvbnRleHQsIGludm9rZXMgYSBwYXJ0aWFsIHdpdGggdGhhdCBjb250ZXh0LFxyXG4gICAgLy8gYW5kIHB1c2hlcyB0aGUgcmVzdWx0IG9mIHRoZSBpbnZvY2F0aW9uIGJhY2suXHJcbiAgICBpbnZva2VQYXJ0aWFsOiBmdW5jdGlvbihpc0R5bmFtaWMsIG5hbWUsIGluZGVudCkge1xyXG4gICAgICB2YXIgcGFyYW1zID0gW10sXHJcbiAgICAgICAgICBvcHRpb25zID0gdGhpcy5zZXR1cFBhcmFtcyhuYW1lLCAxLCBwYXJhbXMsIGZhbHNlKTtcclxuXHJcbiAgICAgIGlmIChpc0R5bmFtaWMpIHtcclxuICAgICAgICBuYW1lID0gdGhpcy5wb3BTdGFjaygpO1xyXG4gICAgICAgIGRlbGV0ZSBvcHRpb25zLm5hbWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChpbmRlbnQpIHtcclxuICAgICAgICBvcHRpb25zLmluZGVudCA9IEpTT04uc3RyaW5naWZ5KGluZGVudCk7XHJcbiAgICAgIH1cclxuICAgICAgb3B0aW9ucy5oZWxwZXJzID0gJ2hlbHBlcnMnO1xyXG4gICAgICBvcHRpb25zLnBhcnRpYWxzID0gJ3BhcnRpYWxzJztcclxuXHJcbiAgICAgIGlmICghaXNEeW5hbWljKSB7XHJcbiAgICAgICAgcGFyYW1zLnVuc2hpZnQodGhpcy5uYW1lTG9va3VwKCdwYXJ0aWFscycsIG5hbWUsICdwYXJ0aWFsJykpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHBhcmFtcy51bnNoaWZ0KG5hbWUpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmNvbXBhdCkge1xyXG4gICAgICAgIG9wdGlvbnMuZGVwdGhzID0gJ2RlcHRocyc7XHJcbiAgICAgIH1cclxuICAgICAgb3B0aW9ucyA9IHRoaXMub2JqZWN0TGl0ZXJhbChvcHRpb25zKTtcclxuICAgICAgcGFyYW1zLnB1c2gob3B0aW9ucyk7XHJcblxyXG4gICAgICB0aGlzLnB1c2godGhpcy5zb3VyY2UuZnVuY3Rpb25DYWxsKCd0aGlzLmludm9rZVBhcnRpYWwnLCAnJywgcGFyYW1zKSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFthc3NpZ25Ub0hhc2hdXHJcbiAgICAvL1xyXG4gICAgLy8gT24gc3RhY2ssIGJlZm9yZTogdmFsdWUsIC4uLiwgaGFzaCwgLi4uXHJcbiAgICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLiwgaGFzaCwgLi4uXHJcbiAgICAvL1xyXG4gICAgLy8gUG9wcyBhIHZhbHVlIG9mZiB0aGUgc3RhY2sgYW5kIGFzc2lnbnMgaXQgdG8gdGhlIGN1cnJlbnQgaGFzaFxyXG4gICAgYXNzaWduVG9IYXNoOiBmdW5jdGlvbihrZXkpIHtcclxuICAgICAgdmFyIHZhbHVlID0gdGhpcy5wb3BTdGFjaygpLFxyXG4gICAgICAgICAgY29udGV4dCxcclxuICAgICAgICAgIHR5cGUsXHJcbiAgICAgICAgICBpZDtcclxuXHJcbiAgICAgIGlmICh0aGlzLnRyYWNrSWRzKSB7XHJcbiAgICAgICAgaWQgPSB0aGlzLnBvcFN0YWNrKCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHRoaXMuc3RyaW5nUGFyYW1zKSB7XHJcbiAgICAgICAgdHlwZSA9IHRoaXMucG9wU3RhY2soKTtcclxuICAgICAgICBjb250ZXh0ID0gdGhpcy5wb3BTdGFjaygpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgaGFzaCA9IHRoaXMuaGFzaDtcclxuICAgICAgaWYgKGNvbnRleHQpIHtcclxuICAgICAgICBoYXNoLmNvbnRleHRzW2tleV0gPSBjb250ZXh0O1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh0eXBlKSB7XHJcbiAgICAgICAgaGFzaC50eXBlc1trZXldID0gdHlwZTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoaWQpIHtcclxuICAgICAgICBoYXNoLmlkc1trZXldID0gaWQ7XHJcbiAgICAgIH1cclxuICAgICAgaGFzaC52YWx1ZXNba2V5XSA9IHZhbHVlO1xyXG4gICAgfSxcclxuXHJcbiAgICBwdXNoSWQ6IGZ1bmN0aW9uKHR5cGUsIG5hbWUsIGNoaWxkKSB7XHJcbiAgICAgIGlmICh0eXBlID09PSAnQmxvY2tQYXJhbScpIHtcclxuICAgICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoXHJcbiAgICAgICAgICAgICdibG9ja1BhcmFtc1snICsgbmFtZVswXSArICddLnBhdGhbJyArIG5hbWVbMV0gKyAnXSdcclxuICAgICAgICAgICAgKyAoY2hpbGQgPyAnICsgJyArIEpTT04uc3RyaW5naWZ5KCcuJyArIGNoaWxkKSA6ICcnKSk7XHJcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ1BhdGhFeHByZXNzaW9uJykge1xyXG4gICAgICAgIHRoaXMucHVzaFN0cmluZyhuYW1lKTtcclxuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnU3ViRXhwcmVzc2lvbicpIHtcclxuICAgICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ3RydWUnKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ251bGwnKTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBIRUxQRVJTXHJcblxyXG4gICAgY29tcGlsZXI6IEphdmFTY3JpcHRDb21waWxlcixcclxuXHJcbiAgICBjb21waWxlQ2hpbGRyZW46IGZ1bmN0aW9uKGVudmlyb25tZW50LCBvcHRpb25zKSB7XHJcbiAgICAgIHZhciBjaGlsZHJlbiA9IGVudmlyb25tZW50LmNoaWxkcmVuLCBjaGlsZCwgY29tcGlsZXI7XHJcblxyXG4gICAgICBmb3IodmFyIGk9MCwgbD1jaGlsZHJlbi5sZW5ndGg7IGk8bDsgaSsrKSB7XHJcbiAgICAgICAgY2hpbGQgPSBjaGlsZHJlbltpXTtcclxuICAgICAgICBjb21waWxlciA9IG5ldyB0aGlzLmNvbXBpbGVyKCk7XHJcblxyXG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMubWF0Y2hFeGlzdGluZ1Byb2dyYW0oY2hpbGQpO1xyXG5cclxuICAgICAgICBpZiAoaW5kZXggPT0gbnVsbCkge1xyXG4gICAgICAgICAgdGhpcy5jb250ZXh0LnByb2dyYW1zLnB1c2goJycpOyAgICAgLy8gUGxhY2Vob2xkZXIgdG8gcHJldmVudCBuYW1lIGNvbmZsaWN0cyBmb3IgbmVzdGVkIGNoaWxkcmVuXHJcbiAgICAgICAgICBpbmRleCA9IHRoaXMuY29udGV4dC5wcm9ncmFtcy5sZW5ndGg7XHJcbiAgICAgICAgICBjaGlsZC5pbmRleCA9IGluZGV4O1xyXG4gICAgICAgICAgY2hpbGQubmFtZSA9ICdwcm9ncmFtJyArIGluZGV4O1xyXG4gICAgICAgICAgdGhpcy5jb250ZXh0LnByb2dyYW1zW2luZGV4XSA9IGNvbXBpbGVyLmNvbXBpbGUoY2hpbGQsIG9wdGlvbnMsIHRoaXMuY29udGV4dCwgIXRoaXMucHJlY29tcGlsZSk7XHJcbiAgICAgICAgICB0aGlzLmNvbnRleHQuZW52aXJvbm1lbnRzW2luZGV4XSA9IGNoaWxkO1xyXG5cclxuICAgICAgICAgIHRoaXMudXNlRGVwdGhzID0gdGhpcy51c2VEZXB0aHMgfHwgY29tcGlsZXIudXNlRGVwdGhzO1xyXG4gICAgICAgICAgdGhpcy51c2VCbG9ja1BhcmFtcyA9IHRoaXMudXNlQmxvY2tQYXJhbXMgfHwgY29tcGlsZXIudXNlQmxvY2tQYXJhbXM7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGNoaWxkLmluZGV4ID0gaW5kZXg7XHJcbiAgICAgICAgICBjaGlsZC5uYW1lID0gJ3Byb2dyYW0nICsgaW5kZXg7XHJcblxyXG4gICAgICAgICAgdGhpcy51c2VEZXB0aHMgPSB0aGlzLnVzZURlcHRocyB8fCBjaGlsZC51c2VEZXB0aHM7XHJcbiAgICAgICAgICB0aGlzLnVzZUJsb2NrUGFyYW1zID0gdGhpcy51c2VCbG9ja1BhcmFtcyB8fCBjaGlsZC51c2VCbG9ja1BhcmFtcztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBtYXRjaEV4aXN0aW5nUHJvZ3JhbTogZnVuY3Rpb24oY2hpbGQpIHtcclxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMuY29udGV4dC5lbnZpcm9ubWVudHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgICB2YXIgZW52aXJvbm1lbnQgPSB0aGlzLmNvbnRleHQuZW52aXJvbm1lbnRzW2ldO1xyXG4gICAgICAgIGlmIChlbnZpcm9ubWVudCAmJiBlbnZpcm9ubWVudC5lcXVhbHMoY2hpbGQpKSB7XHJcbiAgICAgICAgICByZXR1cm4gaTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgcHJvZ3JhbUV4cHJlc3Npb246IGZ1bmN0aW9uKGd1aWQpIHtcclxuICAgICAgdmFyIGNoaWxkID0gdGhpcy5lbnZpcm9ubWVudC5jaGlsZHJlbltndWlkXSxcclxuICAgICAgICAgIHByb2dyYW1QYXJhbXMgPSBbY2hpbGQuaW5kZXgsICdkYXRhJywgY2hpbGQuYmxvY2tQYXJhbXNdO1xyXG5cclxuICAgICAgaWYgKHRoaXMudXNlQmxvY2tQYXJhbXMgfHwgdGhpcy51c2VEZXB0aHMpIHtcclxuICAgICAgICBwcm9ncmFtUGFyYW1zLnB1c2goJ2Jsb2NrUGFyYW1zJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHRoaXMudXNlRGVwdGhzKSB7XHJcbiAgICAgICAgcHJvZ3JhbVBhcmFtcy5wdXNoKCdkZXB0aHMnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuICd0aGlzLnByb2dyYW0oJyArIHByb2dyYW1QYXJhbXMuam9pbignLCAnKSArICcpJztcclxuICAgIH0sXHJcblxyXG4gICAgdXNlUmVnaXN0ZXI6IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgaWYoIXRoaXMucmVnaXN0ZXJzW25hbWVdKSB7XHJcbiAgICAgICAgdGhpcy5yZWdpc3RlcnNbbmFtZV0gPSB0cnVlO1xyXG4gICAgICAgIHRoaXMucmVnaXN0ZXJzLmxpc3QucHVzaChuYW1lKTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBwdXNoOiBmdW5jdGlvbihleHByKSB7XHJcbiAgICAgIGlmICghKGV4cHIgaW5zdGFuY2VvZiBMaXRlcmFsKSkge1xyXG4gICAgICAgIGV4cHIgPSB0aGlzLnNvdXJjZS53cmFwKGV4cHIpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLmlubGluZVN0YWNrLnB1c2goZXhwcik7XHJcbiAgICAgIHJldHVybiBleHByO1xyXG4gICAgfSxcclxuXHJcbiAgICBwdXNoU3RhY2tMaXRlcmFsOiBmdW5jdGlvbihpdGVtKSB7XHJcbiAgICAgIHRoaXMucHVzaChuZXcgTGl0ZXJhbChpdGVtKSk7XHJcbiAgICB9LFxyXG5cclxuICAgIHB1c2hTb3VyY2U6IGZ1bmN0aW9uKHNvdXJjZSkge1xyXG4gICAgICBpZiAodGhpcy5wZW5kaW5nQ29udGVudCkge1xyXG4gICAgICAgIHRoaXMuc291cmNlLnB1c2goXHJcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVG9CdWZmZXIodGhpcy5zb3VyY2UucXVvdGVkU3RyaW5nKHRoaXMucGVuZGluZ0NvbnRlbnQpLCB0aGlzLnBlbmRpbmdMb2NhdGlvbikpO1xyXG4gICAgICAgIHRoaXMucGVuZGluZ0NvbnRlbnQgPSB1bmRlZmluZWQ7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzb3VyY2UpIHtcclxuICAgICAgICB0aGlzLnNvdXJjZS5wdXNoKHNvdXJjZSk7XHJcbiAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgcmVwbGFjZVN0YWNrOiBmdW5jdGlvbihjYWxsYmFjaykge1xyXG4gICAgICB2YXIgcHJlZml4ID0gWycoJ10sXHJcbiAgICAgICAgICBzdGFjayxcclxuICAgICAgICAgIGNyZWF0ZWRTdGFjayxcclxuICAgICAgICAgIHVzZWRMaXRlcmFsO1xyXG5cclxuICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgaWYgKCF0aGlzLmlzSW5saW5lKCkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdyZXBsYWNlU3RhY2sgb24gbm9uLWlubGluZScpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBXZSB3YW50IHRvIG1lcmdlIHRoZSBpbmxpbmUgc3RhdGVtZW50IGludG8gdGhlIHJlcGxhY2VtZW50IHN0YXRlbWVudCB2aWEgJywnXHJcbiAgICAgIHZhciB0b3AgPSB0aGlzLnBvcFN0YWNrKHRydWUpO1xyXG5cclxuICAgICAgaWYgKHRvcCBpbnN0YW5jZW9mIExpdGVyYWwpIHtcclxuICAgICAgICAvLyBMaXRlcmFscyBkbyBub3QgbmVlZCB0byBiZSBpbmxpbmVkXHJcbiAgICAgICAgc3RhY2sgPSBbdG9wLnZhbHVlXTtcclxuICAgICAgICBwcmVmaXggPSBbJygnLCBzdGFja107XHJcbiAgICAgICAgdXNlZExpdGVyYWwgPSB0cnVlO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEdldCBvciBjcmVhdGUgdGhlIGN1cnJlbnQgc3RhY2sgbmFtZSBmb3IgdXNlIGJ5IHRoZSBpbmxpbmVcclxuICAgICAgICBjcmVhdGVkU3RhY2sgPSB0cnVlO1xyXG4gICAgICAgIHZhciBuYW1lID0gdGhpcy5pbmNyU3RhY2soKTtcclxuXHJcbiAgICAgICAgcHJlZml4ID0gWycoKCcsIHRoaXMucHVzaChuYW1lKSwgJyA9ICcsIHRvcCwgJyknXTtcclxuICAgICAgICBzdGFjayA9IHRoaXMudG9wU3RhY2soKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIGl0ZW0gPSBjYWxsYmFjay5jYWxsKHRoaXMsIHN0YWNrKTtcclxuXHJcbiAgICAgIGlmICghdXNlZExpdGVyYWwpIHtcclxuICAgICAgICB0aGlzLnBvcFN0YWNrKCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGNyZWF0ZWRTdGFjaykge1xyXG4gICAgICAgIHRoaXMuc3RhY2tTbG90LS07XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5wdXNoKHByZWZpeC5jb25jYXQoaXRlbSwgJyknKSk7XHJcbiAgICB9LFxyXG5cclxuICAgIGluY3JTdGFjazogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHRoaXMuc3RhY2tTbG90Kys7XHJcbiAgICAgIGlmKHRoaXMuc3RhY2tTbG90ID4gdGhpcy5zdGFja1ZhcnMubGVuZ3RoKSB7IHRoaXMuc3RhY2tWYXJzLnB1c2goXCJzdGFja1wiICsgdGhpcy5zdGFja1Nsb3QpOyB9XHJcbiAgICAgIHJldHVybiB0aGlzLnRvcFN0YWNrTmFtZSgpO1xyXG4gICAgfSxcclxuICAgIHRvcFN0YWNrTmFtZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHJldHVybiBcInN0YWNrXCIgKyB0aGlzLnN0YWNrU2xvdDtcclxuICAgIH0sXHJcbiAgICBmbHVzaElubGluZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZhciBpbmxpbmVTdGFjayA9IHRoaXMuaW5saW5lU3RhY2s7XHJcbiAgICAgIHRoaXMuaW5saW5lU3RhY2sgPSBbXTtcclxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGlubGluZVN0YWNrLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGVudHJ5ID0gaW5saW5lU3RhY2tbaV07XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKGVudHJ5IGluc3RhbmNlb2YgTGl0ZXJhbCkge1xyXG4gICAgICAgICAgdGhpcy5jb21waWxlU3RhY2sucHVzaChlbnRyeSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHZhciBzdGFjayA9IHRoaXMuaW5jclN0YWNrKCk7XHJcbiAgICAgICAgICB0aGlzLnB1c2hTb3VyY2UoW3N0YWNrLCAnID0gJywgZW50cnksICc7J10pO1xyXG4gICAgICAgICAgdGhpcy5jb21waWxlU3RhY2sucHVzaChzdGFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgaXNJbmxpbmU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICByZXR1cm4gdGhpcy5pbmxpbmVTdGFjay5sZW5ndGg7XHJcbiAgICB9LFxyXG5cclxuICAgIHBvcFN0YWNrOiBmdW5jdGlvbih3cmFwcGVkKSB7XHJcbiAgICAgIHZhciBpbmxpbmUgPSB0aGlzLmlzSW5saW5lKCksXHJcbiAgICAgICAgICBpdGVtID0gKGlubGluZSA/IHRoaXMuaW5saW5lU3RhY2sgOiB0aGlzLmNvbXBpbGVTdGFjaykucG9wKCk7XHJcblxyXG4gICAgICBpZiAoIXdyYXBwZWQgJiYgKGl0ZW0gaW5zdGFuY2VvZiBMaXRlcmFsKSkge1xyXG4gICAgICAgIHJldHVybiBpdGVtLnZhbHVlO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmICghaW5saW5lKSB7XHJcbiAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgaWYgKCF0aGlzLnN0YWNrU2xvdCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdJbnZhbGlkIHN0YWNrIHBvcCcpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgdGhpcy5zdGFja1Nsb3QtLTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGl0ZW07XHJcbiAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgdG9wU3RhY2s6IGZ1bmN0aW9uKCkge1xyXG4gICAgICB2YXIgc3RhY2sgPSAodGhpcy5pc0lubGluZSgpID8gdGhpcy5pbmxpbmVTdGFjayA6IHRoaXMuY29tcGlsZVN0YWNrKSxcclxuICAgICAgICAgIGl0ZW0gPSBzdGFja1tzdGFjay5sZW5ndGggLSAxXTtcclxuXHJcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIExpdGVyYWwpIHtcclxuICAgICAgICByZXR1cm4gaXRlbS52YWx1ZTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gaXRlbTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBjb250ZXh0TmFtZTogZnVuY3Rpb24oY29udGV4dCkge1xyXG4gICAgICBpZiAodGhpcy51c2VEZXB0aHMgJiYgY29udGV4dCkge1xyXG4gICAgICAgIHJldHVybiAnZGVwdGhzWycgKyBjb250ZXh0ICsgJ10nO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiAnZGVwdGgnICsgY29udGV4dDtcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBxdW90ZWRTdHJpbmc6IGZ1bmN0aW9uKHN0cikge1xyXG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2UucXVvdGVkU3RyaW5nKHN0cik7XHJcbiAgICB9LFxyXG5cclxuICAgIG9iamVjdExpdGVyYWw6IGZ1bmN0aW9uKG9iaikge1xyXG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2Uub2JqZWN0TGl0ZXJhbChvYmopO1xyXG4gICAgfSxcclxuXHJcbiAgICBhbGlhc2FibGU6IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgdmFyIHJldCA9IHRoaXMuYWxpYXNlc1tuYW1lXTtcclxuICAgICAgaWYgKHJldCkge1xyXG4gICAgICAgIHJldC5yZWZlcmVuY2VDb3VudCsrO1xyXG4gICAgICAgIHJldHVybiByZXQ7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldCA9IHRoaXMuYWxpYXNlc1tuYW1lXSA9IHRoaXMuc291cmNlLndyYXAobmFtZSk7XHJcbiAgICAgIHJldC5hbGlhc2FibGUgPSB0cnVlO1xyXG4gICAgICByZXQucmVmZXJlbmNlQ291bnQgPSAxO1xyXG5cclxuICAgICAgcmV0dXJuIHJldDtcclxuICAgIH0sXHJcblxyXG4gICAgc2V0dXBIZWxwZXI6IGZ1bmN0aW9uKHBhcmFtU2l6ZSwgbmFtZSwgYmxvY2tIZWxwZXIpIHtcclxuICAgICAgdmFyIHBhcmFtcyA9IFtdLFxyXG4gICAgICAgICAgcGFyYW1zSW5pdCA9IHRoaXMuc2V0dXBIZWxwZXJBcmdzKG5hbWUsIHBhcmFtU2l6ZSwgcGFyYW1zLCBibG9ja0hlbHBlcik7XHJcbiAgICAgIHZhciBmb3VuZEhlbHBlciA9IHRoaXMubmFtZUxvb2t1cCgnaGVscGVycycsIG5hbWUsICdoZWxwZXInKTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgcGFyYW1zOiBwYXJhbXMsXHJcbiAgICAgICAgcGFyYW1zSW5pdDogcGFyYW1zSW5pdCxcclxuICAgICAgICBuYW1lOiBmb3VuZEhlbHBlcixcclxuICAgICAgICBjYWxsUGFyYW1zOiBbdGhpcy5jb250ZXh0TmFtZSgwKV0uY29uY2F0KHBhcmFtcylcclxuICAgICAgfTtcclxuICAgIH0sXHJcblxyXG4gICAgc2V0dXBQYXJhbXM6IGZ1bmN0aW9uKGhlbHBlciwgcGFyYW1TaXplLCBwYXJhbXMpIHtcclxuICAgICAgdmFyIG9wdGlvbnMgPSB7fSwgY29udGV4dHMgPSBbXSwgdHlwZXMgPSBbXSwgaWRzID0gW10sIHBhcmFtO1xyXG5cclxuICAgICAgb3B0aW9ucy5uYW1lID0gdGhpcy5xdW90ZWRTdHJpbmcoaGVscGVyKTtcclxuICAgICAgb3B0aW9ucy5oYXNoID0gdGhpcy5wb3BTdGFjaygpO1xyXG5cclxuICAgICAgaWYgKHRoaXMudHJhY2tJZHMpIHtcclxuICAgICAgICBvcHRpb25zLmhhc2hJZHMgPSB0aGlzLnBvcFN0YWNrKCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHRoaXMuc3RyaW5nUGFyYW1zKSB7XHJcbiAgICAgICAgb3B0aW9ucy5oYXNoVHlwZXMgPSB0aGlzLnBvcFN0YWNrKCk7XHJcbiAgICAgICAgb3B0aW9ucy5oYXNoQ29udGV4dHMgPSB0aGlzLnBvcFN0YWNrKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBpbnZlcnNlID0gdGhpcy5wb3BTdGFjaygpLFxyXG4gICAgICAgICAgcHJvZ3JhbSA9IHRoaXMucG9wU3RhY2soKTtcclxuXHJcbiAgICAgIC8vIEF2b2lkIHNldHRpbmcgZm4gYW5kIGludmVyc2UgaWYgbmVpdGhlciBhcmUgc2V0LiBUaGlzIGFsbG93c1xyXG4gICAgICAvLyBoZWxwZXJzIHRvIGRvIGEgY2hlY2sgZm9yIGBpZiAob3B0aW9ucy5mbilgXHJcbiAgICAgIGlmIChwcm9ncmFtIHx8IGludmVyc2UpIHtcclxuICAgICAgICBvcHRpb25zLmZuID0gcHJvZ3JhbSB8fCAndGhpcy5ub29wJztcclxuICAgICAgICBvcHRpb25zLmludmVyc2UgPSBpbnZlcnNlIHx8ICd0aGlzLm5vb3AnO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBUaGUgcGFyYW1ldGVycyBnbyBvbiB0byB0aGUgc3RhY2sgaW4gb3JkZXIgKG1ha2luZyBzdXJlIHRoYXQgdGhleSBhcmUgZXZhbHVhdGVkIGluIG9yZGVyKVxyXG4gICAgICAvLyBzbyB3ZSBuZWVkIHRvIHBvcCB0aGVtIG9mZiB0aGUgc3RhY2sgaW4gcmV2ZXJzZSBvcmRlclxyXG4gICAgICB2YXIgaSA9IHBhcmFtU2l6ZTtcclxuICAgICAgd2hpbGUgKGktLSkge1xyXG4gICAgICAgIHBhcmFtID0gdGhpcy5wb3BTdGFjaygpO1xyXG4gICAgICAgIHBhcmFtc1tpXSA9IHBhcmFtO1xyXG5cclxuICAgICAgICBpZiAodGhpcy50cmFja0lkcykge1xyXG4gICAgICAgICAgaWRzW2ldID0gdGhpcy5wb3BTdGFjaygpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5zdHJpbmdQYXJhbXMpIHtcclxuICAgICAgICAgIHR5cGVzW2ldID0gdGhpcy5wb3BTdGFjaygpO1xyXG4gICAgICAgICAgY29udGV4dHNbaV0gPSB0aGlzLnBvcFN0YWNrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAodGhpcy50cmFja0lkcykge1xyXG4gICAgICAgIG9wdGlvbnMuaWRzID0gdGhpcy5zb3VyY2UuZ2VuZXJhdGVBcnJheShpZHMpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh0aGlzLnN0cmluZ1BhcmFtcykge1xyXG4gICAgICAgIG9wdGlvbnMudHlwZXMgPSB0aGlzLnNvdXJjZS5nZW5lcmF0ZUFycmF5KHR5cGVzKTtcclxuICAgICAgICBvcHRpb25zLmNvbnRleHRzID0gdGhpcy5zb3VyY2UuZ2VuZXJhdGVBcnJheShjb250ZXh0cyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGF0YSkge1xyXG4gICAgICAgIG9wdGlvbnMuZGF0YSA9ICdkYXRhJztcclxuICAgICAgfVxyXG4gICAgICBpZiAodGhpcy51c2VCbG9ja1BhcmFtcykge1xyXG4gICAgICAgIG9wdGlvbnMuYmxvY2tQYXJhbXMgPSAnYmxvY2tQYXJhbXMnO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBvcHRpb25zO1xyXG4gICAgfSxcclxuXHJcbiAgICBzZXR1cEhlbHBlckFyZ3M6IGZ1bmN0aW9uKGhlbHBlciwgcGFyYW1TaXplLCBwYXJhbXMsIHVzZVJlZ2lzdGVyKSB7XHJcbiAgICAgIHZhciBvcHRpb25zID0gdGhpcy5zZXR1cFBhcmFtcyhoZWxwZXIsIHBhcmFtU2l6ZSwgcGFyYW1zLCB0cnVlKTtcclxuICAgICAgb3B0aW9ucyA9IHRoaXMub2JqZWN0TGl0ZXJhbChvcHRpb25zKTtcclxuICAgICAgaWYgKHVzZVJlZ2lzdGVyKSB7XHJcbiAgICAgICAgdGhpcy51c2VSZWdpc3Rlcignb3B0aW9ucycpO1xyXG4gICAgICAgIHBhcmFtcy5wdXNoKCdvcHRpb25zJyk7XHJcbiAgICAgICAgcmV0dXJuIFsnb3B0aW9ucz0nLCBvcHRpb25zXTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBwYXJhbXMucHVzaChvcHRpb25zKTtcclxuICAgICAgICByZXR1cm4gJyc7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG5cclxuXHJcbiAgdmFyIHJlc2VydmVkV29yZHMgPSAoXHJcbiAgICBcImJyZWFrIGVsc2UgbmV3IHZhclwiICtcclxuICAgIFwiIGNhc2UgZmluYWxseSByZXR1cm4gdm9pZFwiICtcclxuICAgIFwiIGNhdGNoIGZvciBzd2l0Y2ggd2hpbGVcIiArXHJcbiAgICBcIiBjb250aW51ZSBmdW5jdGlvbiB0aGlzIHdpdGhcIiArXHJcbiAgICBcIiBkZWZhdWx0IGlmIHRocm93XCIgK1xyXG4gICAgXCIgZGVsZXRlIGluIHRyeVwiICtcclxuICAgIFwiIGRvIGluc3RhbmNlb2YgdHlwZW9mXCIgK1xyXG4gICAgXCIgYWJzdHJhY3QgZW51bSBpbnQgc2hvcnRcIiArXHJcbiAgICBcIiBib29sZWFuIGV4cG9ydCBpbnRlcmZhY2Ugc3RhdGljXCIgK1xyXG4gICAgXCIgYnl0ZSBleHRlbmRzIGxvbmcgc3VwZXJcIiArXHJcbiAgICBcIiBjaGFyIGZpbmFsIG5hdGl2ZSBzeW5jaHJvbml6ZWRcIiArXHJcbiAgICBcIiBjbGFzcyBmbG9hdCBwYWNrYWdlIHRocm93c1wiICtcclxuICAgIFwiIGNvbnN0IGdvdG8gcHJpdmF0ZSB0cmFuc2llbnRcIiArXHJcbiAgICBcIiBkZWJ1Z2dlciBpbXBsZW1lbnRzIHByb3RlY3RlZCB2b2xhdGlsZVwiICtcclxuICAgIFwiIGRvdWJsZSBpbXBvcnQgcHVibGljIGxldCB5aWVsZCBhd2FpdFwiICtcclxuICAgIFwiIG51bGwgdHJ1ZSBmYWxzZVwiXHJcbiAgKS5zcGxpdChcIiBcIik7XHJcblxyXG4gIHZhciBjb21waWxlcldvcmRzID0gSmF2YVNjcmlwdENvbXBpbGVyLlJFU0VSVkVEX1dPUkRTID0ge307XHJcblxyXG4gIGZvcih2YXIgaT0wLCBsPXJlc2VydmVkV29yZHMubGVuZ3RoOyBpPGw7IGkrKykge1xyXG4gICAgY29tcGlsZXJXb3Jkc1tyZXNlcnZlZFdvcmRzW2ldXSA9IHRydWU7XHJcbiAgfVxyXG5cclxuICBKYXZhU2NyaXB0Q29tcGlsZXIuaXNWYWxpZEphdmFTY3JpcHRWYXJpYWJsZU5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XHJcbiAgICByZXR1cm4gIUphdmFTY3JpcHRDb21waWxlci5SRVNFUlZFRF9XT1JEU1tuYW1lXSAmJiAvXlthLXpBLVpfJF1bMC05YS16QS1aXyRdKiQvLnRlc3QobmFtZSk7XHJcbiAgfTtcclxuXHJcbiAgZnVuY3Rpb24gc3RyaWN0TG9va3VwKHJlcXVpcmVUZXJtaW5hbCwgY29tcGlsZXIsIHBhcnRzLCB0eXBlKSB7XHJcbiAgICB2YXIgc3RhY2sgPSBjb21waWxlci5wb3BTdGFjaygpO1xyXG5cclxuICAgIHZhciBpID0gMCxcclxuICAgICAgICBsZW4gPSBwYXJ0cy5sZW5ndGg7XHJcbiAgICBpZiAocmVxdWlyZVRlcm1pbmFsKSB7XHJcbiAgICAgIGxlbi0tO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgc3RhY2sgPSBjb21waWxlci5uYW1lTG9va3VwKHN0YWNrLCBwYXJ0c1tpXSwgdHlwZSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJlcXVpcmVUZXJtaW5hbCkge1xyXG4gICAgICByZXR1cm4gW2NvbXBpbGVyLmFsaWFzYWJsZSgndGhpcy5zdHJpY3QnKSwgJygnLCBzdGFjaywgJywgJywgY29tcGlsZXIucXVvdGVkU3RyaW5nKHBhcnRzW2ldKSwgJyknXTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBzdGFjaztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIF9fZXhwb3J0c19fID0gSmF2YVNjcmlwdENvbXBpbGVyO1xyXG4gIHJldHVybiBfX2V4cG9ydHNfXztcclxufSkoX19tb2R1bGUyX18sIF9fbW9kdWxlNF9fLCBfX21vZHVsZTNfXywgX19tb2R1bGUxNV9fKTtcclxuXHJcbi8vIGhhbmRsZWJhcnMuanNcclxudmFyIF9fbW9kdWxlMF9fID0gKGZ1bmN0aW9uKF9fZGVwZW5kZW5jeTFfXywgX19kZXBlbmRlbmN5Ml9fLCBfX2RlcGVuZGVuY3kzX18sIF9fZGVwZW5kZW5jeTRfXywgX19kZXBlbmRlbmN5NV9fKSB7XHJcbiAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgdmFyIF9fZXhwb3J0c19fO1xyXG4gIC8qZ2xvYmFscyBIYW5kbGViYXJzOiB0cnVlICovXHJcbiAgdmFyIEhhbmRsZWJhcnMgPSBfX2RlcGVuZGVuY3kxX187XHJcblxyXG4gIC8vIENvbXBpbGVyIGltcG9ydHNcclxuICB2YXIgQVNUID0gX19kZXBlbmRlbmN5Ml9fO1xyXG4gIHZhciBQYXJzZXIgPSBfX2RlcGVuZGVuY3kzX18ucGFyc2VyO1xyXG4gIHZhciBwYXJzZSA9IF9fZGVwZW5kZW5jeTNfXy5wYXJzZTtcclxuICB2YXIgQ29tcGlsZXIgPSBfX2RlcGVuZGVuY3k0X18uQ29tcGlsZXI7XHJcbiAgdmFyIGNvbXBpbGUgPSBfX2RlcGVuZGVuY3k0X18uY29tcGlsZTtcclxuICB2YXIgcHJlY29tcGlsZSA9IF9fZGVwZW5kZW5jeTRfXy5wcmVjb21waWxlO1xyXG4gIHZhciBKYXZhU2NyaXB0Q29tcGlsZXIgPSBfX2RlcGVuZGVuY3k1X187XHJcblxyXG4gIHZhciBfY3JlYXRlID0gSGFuZGxlYmFycy5jcmVhdGU7XHJcbiAgdmFyIGNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGhiID0gX2NyZWF0ZSgpO1xyXG5cclxuICAgIGhiLmNvbXBpbGUgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucykge1xyXG4gICAgICByZXR1cm4gY29tcGlsZShpbnB1dCwgb3B0aW9ucywgaGIpO1xyXG4gICAgfTtcclxuICAgIGhiLnByZWNvbXBpbGUgPSBmdW5jdGlvbiAoaW5wdXQsIG9wdGlvbnMpIHtcclxuICAgICAgcmV0dXJuIHByZWNvbXBpbGUoaW5wdXQsIG9wdGlvbnMsIGhiKTtcclxuICAgIH07XHJcblxyXG4gICAgaGIuQVNUID0gQVNUO1xyXG4gICAgaGIuQ29tcGlsZXIgPSBDb21waWxlcjtcclxuICAgIGhiLkphdmFTY3JpcHRDb21waWxlciA9IEphdmFTY3JpcHRDb21waWxlcjtcclxuICAgIGhiLlBhcnNlciA9IFBhcnNlcjtcclxuICAgIGhiLnBhcnNlID0gcGFyc2U7XHJcblxyXG4gICAgcmV0dXJuIGhiO1xyXG4gIH07XHJcblxyXG4gIEhhbmRsZWJhcnMgPSBjcmVhdGUoKTtcclxuICBIYW5kbGViYXJzLmNyZWF0ZSA9IGNyZWF0ZTtcclxuXHJcbiAgLypqc2hpbnQgLVcwNDAgKi9cclxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gIHZhciByb290ID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB3aW5kb3csXHJcbiAgICAgICRIYW5kbGViYXJzID0gcm9vdC5IYW5kbGViYXJzO1xyXG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgSGFuZGxlYmFycy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICBpZiAocm9vdC5IYW5kbGViYXJzID09PSBIYW5kbGViYXJzKSB7XHJcbiAgICAgIHJvb3QuSGFuZGxlYmFycyA9ICRIYW5kbGViYXJzO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIEhhbmRsZWJhcnNbJ2RlZmF1bHQnXSA9IEhhbmRsZWJhcnM7XHJcblxyXG4gIF9fZXhwb3J0c19fID0gSGFuZGxlYmFycztcclxuICByZXR1cm4gX19leHBvcnRzX187XHJcbn0pKF9fbW9kdWxlMV9fLCBfX21vZHVsZTdfXywgX19tb2R1bGU4X18sIF9fbW9kdWxlMTNfXywgX19tb2R1bGUxNF9fKTtcclxuXHJcbiAgcmV0dXJuIF9fbW9kdWxlMF9fO1xyXG59KSk7XHJcbiIsIi8qKlxyXG4gKlxyXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbnZhciBBUFAgPSBBUFAgfHwge307XHJcbkFQUC5NYWluID0gKGZ1bmN0aW9uKCkge1xyXG5cclxuICAgIHZhciBMQVpZX0xPQURfVEhSRVNIT0xEID0gMzAwO1xyXG4gICAgdmFyICQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yLmJpbmQoZG9jdW1lbnQpO1xyXG5cclxuICAgIHZhciBzdG9yaWVzID0gbnVsbDtcclxuICAgIHZhciBzdG9yeVN0YXJ0ID0gMDtcclxuICAgIHZhciBjb3VudCA9IDIwO1xyXG4gICAgdmFyIG1haW4gPSAkKCdtYWluJyk7XHJcbiAgICB2YXIgaW5EZXRhaWxzID0gZmFsc2U7XHJcbiAgICB2YXIgc3RvcnlMb2FkQ291bnQgPSAwO1xyXG4gICAgdmFyIHN0b3J5RGV0YWlscyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3NlY3Rpb24nKTtcclxuICAgIHZhciBzdG9yeURldGFpbHNWYXJzID0ge307XHJcbiAgICB2YXIgc2Nyb2xsVGltZXIgPSBudWxsO1xyXG4gICAgdmFyIGxvY2FsZURhdGEgPSB7XHJcbiAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICBpbnRsOiB7XHJcbiAgICAgICAgICAgICAgICBsb2NhbGVzOiAnZW4tVVMnXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciB0bXBsU3RvcnkgPSAkKCcjdG1wbC1zdG9yeScpLnRleHRDb250ZW50O1xyXG4gICAgdmFyIHRtcGxTdG9yeURldGFpbHMgPSAkKCcjdG1wbC1zdG9yeS1kZXRhaWxzJykudGV4dENvbnRlbnQ7XHJcbiAgICB2YXIgdG1wbFN0b3J5RGV0YWlsc0NvbW1lbnQgPSAkKCcjdG1wbC1zdG9yeS1kZXRhaWxzLWNvbW1lbnQnKS50ZXh0Q29udGVudDtcclxuXHJcbiAgICBpZiAodHlwZW9mIEhhbmRsZWJhcnNJbnRsICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgICAgIEhhbmRsZWJhcnNJbnRsLnJlZ2lzdGVyV2l0aChIYW5kbGViYXJzKTtcclxuICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgIC8vIFJlbW92ZSByZWZlcmVuY2VzIHRvIGZvcm1hdFJlbGF0aXZlLCBiZWNhdXNlIEludGwgaXNuJ3Qgc3VwcG9ydGVkLlxyXG4gICAgICAgIHZhciBpbnRsUmVsYXRpdmUgPSAvLCB7eyBmb3JtYXRSZWxhdGl2ZSB0aW1lIH19LztcclxuICAgICAgICB0bXBsU3RvcnkgPSB0bXBsU3RvcnkucmVwbGFjZShpbnRsUmVsYXRpdmUsICcnKTtcclxuICAgICAgICB0bXBsU3RvcnlEZXRhaWxzID0gdG1wbFN0b3J5RGV0YWlscy5yZXBsYWNlKGludGxSZWxhdGl2ZSwgJycpO1xyXG4gICAgICAgIHRtcGxTdG9yeURldGFpbHNDb21tZW50ID0gdG1wbFN0b3J5RGV0YWlsc0NvbW1lbnQucmVwbGFjZShpbnRsUmVsYXRpdmUsICcnKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgc3RvcnlUZW1wbGF0ZSA9XHJcbiAgICAgICAgSGFuZGxlYmFycy5jb21waWxlKHRtcGxTdG9yeSk7XHJcbiAgICB2YXIgc3RvcnlEZXRhaWxzVGVtcGxhdGUgPVxyXG4gICAgICAgIEhhbmRsZWJhcnMuY29tcGlsZSh0bXBsU3RvcnlEZXRhaWxzKTtcclxuICAgIHZhciBzdG9yeURldGFpbHNDb21tZW50VGVtcGxhdGUgPVxyXG4gICAgICAgIEhhbmRsZWJhcnMuY29tcGlsZSh0bXBsU3RvcnlEZXRhaWxzQ29tbWVudCk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBcyBldmVyeSBzaW5nbGUgc3RvcnkgYXJyaXZlcyBpbiBzaG92ZSBpdHNcclxuICAgICAqIGNvbnRlbnQgaW4gYXQgdGhhdCBleGFjdCBtb21lbnQuIEZlZWxzIGxpa2Ugc29tZXRoaW5nXHJcbiAgICAgKiB0aGF0IHNob3VsZCByZWFsbHkgYmUgaGFuZGxlZCBtb3JlIGRlbGljYXRlbHksIGFuZFxyXG4gICAgICogcHJvYmFibHkgaW4gYSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgY2FsbGJhY2suXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIG9uU3RvcnlEYXRhKGtleSwgZGV0YWlscykge1xyXG5cclxuICAgICAgICAvLyBUaGlzIHNlZW1zIG9kZC4gU3VyZWx5IHdlIGNvdWxkIGp1c3Qgc2VsZWN0IHRoZSBzdG9yeVxyXG4gICAgICAgIC8vIGRpcmVjdGx5IHJhdGhlciB0aGFuIGxvb3BpbmcgdGhyb3VnaCBhbGwgb2YgdGhlbS5cclxuXHJcbiAgICAgICAgZGV0YWlscy50aW1lICo9IDEwMDA7XHJcbiAgICAgICAgdmFyIHN0b3J5ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3MtJyArIGtleSk7XHJcbiAgICAgICAgdmFyIGh0bWwgPSBzdG9yeVRlbXBsYXRlKGRldGFpbHMpO1xyXG4gICAgICAgIGZhc3Rkb20ubXV0YXRlKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzdG9yeS5pbm5lckhUTUwgPSBodG1sO1xyXG4gICAgICAgICAgICBzdG9yeS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIG9uU3RvcnlDbGljay5iaW5kKHRoaXMsIGRldGFpbHMpKTtcclxuICAgICAgICAgICAgc3RvcnkuY2xhc3NMaXN0LmFkZCgnY2xpY2thYmxlJyk7XHJcbiAgICAgICAgICAgIC8vIFRpY2sgZG93bi4gV2hlbiB6ZXJvIHdlIGNhbiBiYXRjaCBpbiB0aGUgbmV4dCBsb2FkLlxyXG4gICAgICAgICAgICBzdG9yeUxvYWRDb3VudC0tO1xyXG5cclxuICAgICAgICAgICAgLy8gQ29sb3JpemUgb24gY29tcGxldGUuXHJcbiAgICAgICAgICAgIGlmIChzdG9yeUxvYWRDb3VudCA9PT0gMClcclxuICAgICAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShjb2xvcml6ZUFuZFNjYWxlU3RvcmllcylcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvblN0b3J5Q2xpY2soZGV0YWlscykge1xyXG4gICAgICAgIGlmIChkZXRhaWxzLnVybClcclxuICAgICAgICAgICAgZGV0YWlscy51cmxvYmogPSBuZXcgVVJMKGRldGFpbHMudXJsKTtcclxuXHJcbiAgICAgICAgdmFyIGNvbW1lbnQ7XHJcbiAgICAgICAgdmFyIGNvbW1lbnRzRWxlbWVudDtcclxuICAgICAgICB2YXIgc3RvcnlIZWFkZXI7XHJcbiAgICAgICAgdmFyIHN0b3J5Q29udGVudDtcclxuXHJcblxyXG5cclxuICAgICAgICBzdG9yeURldGFpbHNWYXJzLmlkID0gc3RvcnlEZXRhaWxzLmdldEF0dHJpYnV0ZShcImlkXCIpO1xyXG4gICAgICAgIGlmIChzdG9yeURldGFpbHNWYXJzLmlkID09PSAnc2QtJyArIGRldGFpbHMuaWQpIHtcclxuICAgICAgICAgICAgdG9nZ2xlU3RvcnkoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHN0b3J5RGV0YWlsc1ZhcnMuaWQgPSAnc2QtJyArIGRldGFpbHMuaWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBzdG9yeURldGFpbHNIdG1sID0gc3RvcnlEZXRhaWxzVGVtcGxhdGUoZGV0YWlscyk7XHJcbiAgICAgICAgdmFyIGtpZHMgPSBkZXRhaWxzLmtpZHM7XHJcbiAgICAgICAgdmFyIGNvbW1lbnRIdG1sID0gc3RvcnlEZXRhaWxzQ29tbWVudFRlbXBsYXRlKHtcclxuICAgICAgICAgICAgYnk6ICcnLFxyXG4gICAgICAgICAgICB0ZXh0OiAnTG9hZGluZyBjb21tZW50Li4uJ1xyXG4gICAgICAgIH0pO1xyXG5cclxuXHJcbiAgICAgICAgc3RvcnlEZXRhaWxzLnNldEF0dHJpYnV0ZSgnaWQnLCBzdG9yeURldGFpbHMuaWQpO1xyXG4gICAgICAgIHN0b3J5RGV0YWlscy5pbm5lckhUTUwgPSBzdG9yeURldGFpbHNIdG1sO1xyXG4gICAgICAgIHZhciBjbG9zZUJ1dHRvbiA9IHN0b3J5RGV0YWlscy5xdWVyeVNlbGVjdG9yKCcuanMtY2xvc2UnKTtcclxuICAgICAgICBjbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRvZ2dsZVN0b3J5KTtcclxuXHJcblxyXG5cclxuICAgICAgICBjb21tZW50c0VsZW1lbnQgPSBzdG9yeURldGFpbHMucXVlcnlTZWxlY3RvcignLmpzLWNvbW1lbnRzJyk7XHJcbiAgICAgICAgc3RvcnlIZWFkZXIgPSBzdG9yeURldGFpbHMucXVlcnlTZWxlY3RvcignLmpzLWhlYWRlcicpO1xyXG4gICAgICAgIHN0b3J5Q29udGVudCA9IHN0b3J5RGV0YWlscy5xdWVyeVNlbGVjdG9yKCcuanMtY29udGVudCcpO1xyXG5cclxuICAgICAgICAvL3ZhciBoZWFkZXJIZWlnaHQgPSBzdG9yeUhlYWRlci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XHJcbiAgICAgICAgLy9zdG9yeUNvbnRlbnQuc3R5bGUucGFkZGluZ1RvcCA9IGhlYWRlckhlaWdodCArICdweCc7XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2Yga2lkcyA9PT0gJ3VuZGVmaW5lZCcpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBraWRzLmxlbmd0aDsgaysrKSB7XHJcbiAgICAgICAgICAgIEFQUC5EYXRhLmdldFN0b3J5Q29tbWVudChraWRzW2tdLCBmdW5jdGlvbihjb21tZW50RGV0YWlscykge1xyXG4gICAgICAgICAgICAgICAgY29tbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2FzaWRlJyk7XHJcbiAgICAgICAgICAgICAgICBjb21tZW50LnNldEF0dHJpYnV0ZSgnaWQnLCAnc2RjLScgKyBraWRzW2tdKTtcclxuICAgICAgICAgICAgICAgIGNvbW1lbnQuY2xhc3NMaXN0LmFkZCgnc3RvcnktZGV0YWlsc19fY29tbWVudCcpO1xyXG4gICAgICAgICAgICAgICAgY29tbWVudC5pbm5lckhUTUwgPSBjb21tZW50SHRtbDtcclxuICAgICAgICAgICAgICAgIGNvbW1lbnRzRWxlbWVudC5hcHBlbmRDaGlsZChjb21tZW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGNvbW1lbnQgd2l0aCB0aGUgbGl2ZSBkYXRhLlxyXG4gICAgICAgICAgICAgICAgY29tbWVudERldGFpbHMudGltZSAqPSAxMDAwO1xyXG4gICAgICAgICAgICAgICAgY29tbWVudC5pbm5lckhUTUwgPSBzdG9yeURldGFpbHNDb21tZW50VGVtcGxhdGUoXHJcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudERldGFpbHMsXHJcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxlRGF0YSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0b2dnbGVTdG9yeSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHRvZ2dsZVN0b3J5KCkge1xyXG4gICAgICAgIHZhciBkdW1tID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHN0b3J5RGV0YWlscy5jbGFzc0xpc3QudG9nZ2xlKCdoaWRkZW4nKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGR1bW0pO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIERvZXMgdGhpcyByZWFsbHkgYWRkIGFueXRoaW5nPyBDYW4gd2UgZG8gdGhpcyBraW5kXHJcbiAgICAgKiBvZiB3b3JrIGluIGEgY2hlYXBlciB3YXk/XHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGNvbG9yaXplQW5kU2NhbGVTdG9yaWVzKCkge1xyXG4gICAgICAgIC8vcmV0dXJuIHRydWU7XHJcbiAgICAgICAgLy9cclxuICAgICAgICB2YXIgZG90cyA9IFtdO1xyXG4gICAgICAgIHZhciBkb3QgPSB7fTtcclxuICAgICAgICB2YXIgc3RvcnlFbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5zdG9yeScpO1xyXG4gICAgICAgIHZhciBib2R5dG9wID0gZG9jdW1lbnQuYm9keS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3A7XHJcbiAgICAgICAgdmFyIGhlaWdodCA9IG1haW4ub2Zmc2V0SGVpZ2h0O1xyXG4gICAgICAgIHZhciBtYWluUG9zaXRpb24gPSBtYWluLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgIC8vIEl0IGRvZXMgc2VlbSBhd2Z1bGx5IGJyb2FkIHRvIGNoYW5nZSBhbGwgdGhlXHJcbiAgICAgICAgLy8gY29sb3JzIGV2ZXJ5IHRpbWUhXHJcbiAgICAgICAgZm9yICh2YXIgcyA9IDA7IHMgPCBzdG9yeUVsZW1lbnRzLmxlbmd0aDsgcysrKSB7XHJcbiAgICAgICAgICAgIGRvdCA9IHt9O1xyXG4gICAgICAgICAgICB2YXIgc3RvcnkgPSBzdG9yeUVsZW1lbnRzW3NdO1xyXG4gICAgICAgICAgICB2YXIgc2NvcmUgPSBzdG9yeS5xdWVyeVNlbGVjdG9yKCcuc3RvcnlfX3Njb3JlJyk7XHJcbiAgICAgICAgICAgIHZhciB0aXRsZSA9IHN0b3J5LnF1ZXJ5U2VsZWN0b3IoJy5zdG9yeV9fdGl0bGUnKTtcclxuICAgICAgICAgICAgdmFyIHNjb3JlTG9jYXRpb24gPSBzY29yZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgLSBib2R5dG9wO1xyXG4gICAgICAgICAgICB2YXIgc2NhbGUgPSBNYXRoLm1pbigxLCAxIC0gKDAuMDUgKiAoKHNjb3JlTG9jYXRpb24gLSAxNzApIC8gaGVpZ2h0KSkpO1xyXG4gICAgICAgICAgICB2YXIgZG90c2l6ZSA9IHNjYWxlICogNDA7XHJcbiAgICAgICAgICAgIHZhciBzYXR1cmF0aW9uID0gKDEwMCAqICgoZG90c2l6ZSAtIDM4KSAvIDIpKTtcclxuXHJcbiAgICAgICAgICAgIGRvdC5kb3RzaXplID0gc2NhbGUgKiA0MDtcclxuICAgICAgICAgICAgZG90Lm9wYWNpdHkgPSBzY2FsZTtcclxuICAgICAgICAgICAgZG90LnNhdHVyYXRpb24gPSBzYXR1cmF0aW9uXHJcbiAgICAgICAgICAgIGRvdC5zdG9yeSA9IHN0b3J5O1xyXG4gICAgICAgICAgICBkb3Quc2NvcmUgPSBzY29yZTtcclxuICAgICAgICAgICAgZG90LnRpdGxlID0gdGl0bGU7XHJcbiAgICAgICAgICAgIGRvdHMucHVzaChkb3QpO1xyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBmdW5jdGlvbiBwYWludGRvdHMoKSB7XHJcbiAgICAgICAgICAgIGRvdHMubWFwKGZ1bmN0aW9uKGRvdCkge1xyXG4gICAgICAgICAgICAgICAgZG90LnNjb3JlLnN0eWxlLndpZHRoID0gZG90LmRvdHNpemUgKyAncHgnO1xyXG4gICAgICAgICAgICAgICAgZG90LnNjb3JlLnN0eWxlLmhlaWdodCA9IGRvdC5kb3RzaXplICsgJ3B4JztcclxuICAgICAgICAgICAgICAgIGRvdC5zY29yZS5zdHlsZS5saW5lSGVpZ2h0ID0gZG90LmRvdHNpemUgKyAncHgnO1xyXG4gICAgICAgICAgICAgICAgZG90LnNjb3JlLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdoc2woNDIsICcgKyBkb3Quc2F0dXJhdGlvbiArICclLCA1MCUpJztcclxuICAgICAgICAgICAgICAgIGRvdC50aXRsZS5zdHlsZS5vcGFjaXR5ID0gZG90Lm9wYWNpdHk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShwYWludGRvdHMpO1xyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFmdGVyU2Nyb2xsKCkge1xyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShjb2xvcml6ZUFuZFNjYWxlU3RvcmllcylcclxuICAgIH1cclxuXHJcblxyXG5cclxuXHJcbiAgICBtYWluLmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGlmIChzY3JvbGxUaW1lciAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoc2Nyb2xsVGltZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzY3JvbGxUaW1lciA9IHNldFRpbWVvdXQoYWZ0ZXJTY3JvbGwsIDUwKTtcclxuICAgICAgICB2YXIgaGVhZGVyID0gJCgnaGVhZGVyJyk7XHJcbiAgICAgICAgdmFyIGhlYWRlclRpdGxlcyA9IGhlYWRlci5xdWVyeVNlbGVjdG9yKCcuaGVhZGVyX190aXRsZS13cmFwcGVyJyk7XHJcbiAgICAgICAgdmFyIHNjcm9sbFRvcENhcHBlZCA9IE1hdGgubWluKDcwLCBtYWluLnNjcm9sbFRvcCk7XHJcbiAgICAgICAgdmFyIHNjYWxlU3RyaW5nID0gJ3NjYWxlKCcgKyAoMSAtIChzY3JvbGxUb3BDYXBwZWQgLyAzMDApKSArICcpJztcclxuXHJcbiAgICAgICAgaGVhZGVyLnN0eWxlLmhlaWdodCA9ICgxNTYgLSBzY3JvbGxUb3BDYXBwZWQpICsgJ3B4JztcclxuICAgICAgICBoZWFkZXJUaXRsZXMuc3R5bGUud2Via2l0VHJhbnNmb3JtID0gc2NhbGVTdHJpbmc7XHJcbiAgICAgICAgaGVhZGVyVGl0bGVzLnN0eWxlLnRyYW5zZm9ybSA9IHNjYWxlU3RyaW5nO1xyXG5cclxuICAgICAgICAvLyBBZGQgYSBzaGFkb3cgdG8gdGhlIGhlYWRlci5cclxuICAgICAgICBmYXN0ZG9tLm11dGF0ZShmdW5jdGlvbigpIHtcclxuICAgICAgICBpZiAobWFpbi5zY3JvbGxUb3AgPiA3MClcclxuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKCdyYWlzZWQnKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZSgncmFpc2VkJyk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAvLyBDaGVjayBpZiB3ZSBuZWVkIHRvIGxvYWQgdGhlIG5leHQgYmF0Y2ggb2Ygc3Rvcmllcy5cclxuICAgICAgICB2YXIgbG9hZFRocmVzaG9sZCA9IChtYWluLnNjcm9sbEhlaWdodCAtIG1haW4ub2Zmc2V0SGVpZ2h0IC1cclxuICAgICAgICAgICAgTEFaWV9MT0FEX1RIUkVTSE9MRCk7XHJcbiAgICAgICAgaWYgKG1haW4uc2Nyb2xsVG9wID4gbG9hZFRocmVzaG9sZClcclxuICAgICAgICAgICAgbG9hZFN0b3J5QmF0Y2goKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGZ1bmN0aW9uIGxvYWRTdG9yeUJhdGNoKCkge1xyXG5cclxuICAgICAgICBpZiAoc3RvcnlMb2FkQ291bnQgPiAwKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIHN0b3J5TG9hZENvdW50ID0gY291bnQ7XHJcblxyXG4gICAgICAgIHZhciBlbmQgPSBzdG9yeVN0YXJ0ICsgY291bnQ7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IHN0b3J5U3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xyXG5cclxuICAgICAgICAgICAgaWYgKGkgPj0gc3Rvcmllcy5sZW5ndGgpXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICB2YXIga2V5ID0gU3RyaW5nKHN0b3JpZXNbaV0pO1xyXG4gICAgICAgICAgICB2YXIgc3RvcnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgc3Rvcnkuc2V0QXR0cmlidXRlKCdpZCcsICdzLScgKyBrZXkpO1xyXG4gICAgICAgICAgICBzdG9yeS5jbGFzc0xpc3QuYWRkKCdzdG9yeScpO1xyXG4gICAgICAgICAgICBzdG9yeS5pbm5lckhUTUwgPSBzdG9yeVRlbXBsYXRlKHtcclxuICAgICAgICAgICAgICAgIHRpdGxlOiAnLi4uJyxcclxuICAgICAgICAgICAgICAgIHNjb3JlOiAnLScsXHJcbiAgICAgICAgICAgICAgICBieTogJy4uLicsXHJcbiAgICAgICAgICAgICAgICB0aW1lOiAwXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBtYWluLmFwcGVuZENoaWxkKHN0b3J5KTtcclxuXHJcbiAgICAgICAgICAgIEFQUC5EYXRhLmdldFN0b3J5QnlJZChzdG9yaWVzW2ldLCBvblN0b3J5RGF0YS5iaW5kKHRoaXMsIGtleSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3RvcnlTdGFydCArPSBjb3VudDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gQm9vdHN0cmFwIGluIHRoZSBzdG9yaWVzLlxyXG4gICAgQVBQLkRhdGEuZ2V0VG9wU3RvcmllcyhmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgc3RvcmllcyA9IGRhdGE7XHJcbiAgICAgICAgbG9hZFN0b3J5QmF0Y2goKTtcclxuICAgICAgICBtYWluLmNsYXNzTGlzdC5yZW1vdmUoJ2xvYWRpbmcnKTtcclxuICAgIH0pO1xyXG5cclxufSkoKTtcclxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
