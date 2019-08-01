/*
 * DJ - Drupal JavaScript behavior manager (version 0.1.10);
 * */

(function (undefined) {
  "use strict";

  var _options = {
    themeName   : 'DJ',
    classPrefix : 'dj-',
    env         : 'prod',
    breakpoints : false,
    systemLogOptions: {
      isLogBehaviorAttachBegin      : true,
      isLogBehaviorExecutionTime    : true,
      isLogAllBehaviorsExecutionTime: true
    },

  };

  var _console;

  if(window.console){
    _console = window.console;

    if (typeof window.console.log == "object" && Function.prototype.bind && window.console) {
      var cm = ["log","info","warn","error","assert","dir","clear","profile","profileEnd"];

      for(var i = 0; i < cm.length; i++){
        window.console[ cm[i] ] = Function.prototype.bind.call(window.console[ cm[i] ], window.console);
      }
    }
  } else{
    _console = {
      log: function () {},
      info: function () {},
      warn: function () {},
      error: function () {}
    }
  }

  if(window.DJ !== undefined){
    _console.warn("[Theme: " + _options.themeName + "] \nName \"" + _options.themeName + "\" is already used!\nYou can use function noConflict([newThemeName]) to set another name.");
  }


  /**
   * Variables
   * */

  var jQuery = window.jQuery ? window.jQuery : false;

  //Check performance
  var _performance = window.performance;
  if(!window.performance || !window.performance.now){
    _performance = {now: function(){return 0}};
  }

  var _behaviors      = {};
  var _storage        = {};
  var _prevDJ         = window[_options.themeName];
  var _eventHandlers  = {};
  var _numOfBehaviors = 0;
  var isOptionsSet    = false;


  var _DJ = new DJ();
  window[_options.themeName] = _DJ;

  _watchDOMReady();
  _DJ.browser  = _detectBrowser();
  _DJ.isDevice = _detectDevice();
  _DJ.isTouchScreen  = _detectTouch();
  _removeDesktopStylesOnDevice();

  /**
   * DJ Core
   * */

  function DJ(){
    this.themeName  = _options.themeName;
    this.log        = _log;
    this.logError   = _logError;
    this.logWarn    = _logWarn;
    this.logInfo    = _logInfo;
    this.env        = _options.env;
    this.behaviors  = _behaviors;
    this.isDOMReady = false;
    this.storage    = new DJStorage();
    this.bp         = undefined;
  };

  DJ.prototype.addBehavior = function(name, selector, options){
    if(!name || name in _behaviors){
      _logWarn('[addBehavior] Behavior wasn\'t added because the [name] is empty!');
      return false;
    }

    if(selector instanceof Object){
      options  = selector;
      selector = 'html';
    }

    if(!(options instanceof Object)){
      _logWarn('Behavior \'' + name + '\' wasn\'t added because the [options] is empty!');
      return false;
    }

    options.name     = name;
    options.selector = selector + '';

    _behaviors[name] = new DJBehavior(options);

    Drupal.behaviors[name] = {
      attach: function(context, settings){
        _DJ.attachBehavior(name, context, settings);
      },
      detach: function(context, settings){
        _DJ.detachBehavior(name, context, settings);
      }
    };

    _numOfBehaviors++;

    _behaviors[name].log('Added;');

    if(_DJ.isDOMReady){
      _DJ.attachBehavior(name);
    }

    return true;
  };

  DJ.prototype.removeBehavior = function(name){
    if(!name){
      _logWarn('[removeBehavior] Behavior wasn\'t removed because the [name] is empty!');
      return false;
    }

    if(!(name in _behaviors)){
      _logWarn('[removeBehavior] Behavior \'' + name + '\' is not present!');
      return false;
    }

    _behaviors[name].detach(document, _getDrupalSettings());

    delete _behaviors[name];
    delete Drupal.behaviors[name];

    _numOfBehaviors--;
  };

  DJ.prototype.attachBehavior = function(behaviorName, context, settings){
    context  = context  ? context : (jQuery ? jQuery(document) : document);
    settings = settings || _getDrupalSettings();

    if(behaviorName in _behaviors){
      _behaviors[behaviorName].attach(context, settings);
    }
  };

  DJ.prototype.detachBehavior = function(behaviorName, context, settings){
    context  = context  ? context : (jQuery ? jQuery(document) : document);
    settings = settings || _getDrupalSettings();

    if(behaviorName in _behaviors){
      _behaviors[behaviorName].detach(context, settings);
    }
  };

  DJ.prototype.attachAllBehaviors = function(context, settings){
    context  = context ? context : (jQuery ? jQuery(document) : document);
    settings = settings || _getDrupalSettings();

    var t0 = _performance.now();

    for(var b in _behaviors){
      _behaviors[b].attach(context, settings);
    }

    var t1 = _performance.now();

    _logInfo('Behaviors were attached.' +
      '\nExecution time:      ' + (t1 - t0).toFixed(2) + ' milliseconds;');
  };

  DJ.prototype.detachAllBehaviors = function(context, settings){
    context  = context ? context : (jQuery ? jQuery(document) : document);
    settings = settings || _getDrupalSettings();

    var t0 = _performance.now();

    for(var b in _behaviors){
      _behaviors[b].detach(context, settings);
    }

    var t1 = _performance.now();

    _logInfo('Behaviors were detached.' +
      '\nExecution time:      ' + (t1 - t0).toFixed(2) + ' milliseconds;');
  };

  DJ.prototype.isAttaced = function(behaviorName, domElement){
    if(!(domElement instanceof Node) && !(behaviorName instanceof String)){
      return undefined;
    }

    return !!domElement[behaviorName + '_isAttachedOnce'];
  };

  DJ.prototype.setOptions = function(opt){
    if(isOptionsSet){
      return false;
    }

    if(typeof(opt) != 'object'){
      return;
    }

    if(opt.noConflict){
      _DJ.noConflict(opt.noConflict);
    }

    if(opt.env){
      _DJ.env = opt.env;
    }

    if(opt.breakpoints){
      _DJ.bp = new DJBreakpoints(opt.breakpoints);
    }

    isOptionsSet = true;

    return _DJ;
  };

  DJ.prototype.setSystemLogOptions = function(options){

    return _DJ;
  };

  DJ.prototype.noConflict = function(newName){
    if(!newName || newName === window[_options.themeName]){
      return false;
    }

    if(_prevDJ === undefined){
      window[newName] = _DJ;
      delete window[_options.themeName];

    } else if(_prevDJ !== undefined){
      window[_options.themeName] = _prevDJ;
      window[newName] = _DJ;
      _prevDJ = undefined;
    }

    _options.themeName = newName;

    return _DJ;
  };

  DJ.prototype.on = function(eventName, callback, context){
    //TODO off
    if(!eventName){
      return false;
    }

    if(!(callback instanceof Function)){
      return false;
    }

    var context      = context ? context : window;
    var eventName    = eventName + '';

    if(!(eventName in _eventHandlers)){
      _eventHandlers[eventName] = [];
    }

    _eventHandlers[eventName].push({
      eventName: eventName,
      callback:  callback,
      context:   context,
    });

    return true;
  };

  DJ.prototype.off = function(eventName, callback){
    //TODO;
  };

  DJ.prototype.trigger = function(eventName, eventData){
    //TODO send N custom arguments by trigger function

    if(!(eventName in _eventHandlers)){
      return false;
    }

    var handlers    = _eventHandlers[eventName],
      handler,
      eventObject = new DJEvent(_extendObject({eventName: eventName}, eventData)),
      args = [];

    for(var i = 0; i < handlers.length; i++){
      handler = handlers[i];
      args.unshift(eventObject);
      handler.callback.apply(handler.context, args);
    }
  };

  DJ.prototype.getDrupalSettings = function(){
    return _getDrupalSettings();
  };


  /**
   * Class DJBehavior
   * */

  function DJBehavior(options){
    var _options = {
      name:           'noName',
      theme:          _DJ,
      DOMElements:    [],
      selector:       '',
      isOnce:         true,
      attach:         null,
      detach:         null,
      beforeAttaches: function(){},
      afterAttaches:  function(){}
    };

    var _this = this,
      _privateNames = 'attach,detach,beforeAttaches,afterAttaches,DOMElements,$DOMElements',
      _isReady = false;

    _options = _extendObject(_options, options);

    for(var key in _options){
      if(_privateNames.indexOf(key) < 0){
        _this[key] = _options[key];
      }
    };

    this.log = function(){
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[Behavior: ' + _this.name + ']');
      _log.apply(_console, args);
    };

    this.logError = function(){
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[Behavior: ' + _this.name + ']');
      _logError.apply(_console, args);
    };

    this.logWarn = function(){
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[Behavior: ' + _this.name + ']');
      _logWarn.apply(_console, args);
    };

    this.logInfo = function(){
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[Behavior: ' + _this.name + ']');
      _logInfo.apply(_console, args);
    };

    var _isAttachedKey = '_isDJBehaviorAttached_' + _options.name;

    this.attach = function(context, settings){

      if(!(_options.attach instanceof Function)){
        _this.log('Attach is called but it\'s not defined.');
        return;
      }

      var $context  = jQuery(context),
        $$context = $context[0];

      if(!$context.length){
        _this.logWarn('Trying to attach. Context is empty!');
        return;
      }

      var args = [$context, settings, _this],
        DOMElementsToAttach  = [],
        DOMElementsInContext = [],
        DOMElements,
        el,
        attachedWithSuccess  = 0,
        attachedWithError    = 0,
        i;

      //Select DOM elements to be attached

      DOMElements = jQuery(_options.selector);

      for(i = 0; i < DOMElements.length; i++){
        el = DOMElements.eq(i);

        if(jQuery.contains($$context, el[0])){
          DOMElementsInContext.push(el[0]);
        }

        if($context[0] === el[0]){
          DOMElementsInContext.push(el[0]);
        }
      }

      if(_options.isOnce){
        for(i = 0; i < DOMElementsInContext.length; i++){
          el = DOMElementsInContext[i];

          if(!el[_isAttachedKey]){
            DOMElementsToAttach.push(el);
          }
        }
      } else{
        DOMElementsToAttach = DOMElementsInContext;
      }

      if(DOMElementsToAttach.length){
        //Before attaches
        _options.beforeAttaches.apply(_this, args);

        //Attaches
        _this.log('Start attach.\n' + 'Attaching: ' + DOMElementsToAttach.length + ' DOM element(s);');
        var t0 = _performance.now();

        for(i = 0; i < DOMElementsToAttach.length; i++){
          el = DOMElementsToAttach[i];

          try {
            _options.attach.apply(el, args);

            el[_isAttachedKey] = true;
            attachedWithSuccess++;
            el.className = (_DJ.themeName + '__' + _options.name + '__processed ') + el.className;
            el.className = el.className.replace(_DJ.themeName + '__' + _options.name + '__processedWithError', '');

          } catch (err){
            attachedWithError++;
            _this.logError('\n', err.stack);
            el.className = (_DJ.themeName + '__' + _options.name + '__processedWithError ') + el.className;
          }
        }

        var t1 = _performance.now();

        _DJ.trigger('attachBehavior', {
          behavior:            _options.name,
          attachedTo:          attachedWithSuccess + attachedWithError,
          atachedWithError:    attachedWithError,
          attachedWithSuccess: attachedWithSuccess,
          context:             $context,
          settings:            settings
        });

        _this.log('End attach.\n' +
          'Attached with success: ' + attachedWithSuccess + ' DOM element(s);\n' +
          'Attached with error:   ' + attachedWithError + ' DOM element(s);\n' +
          'Execution time:        ' + (t1 - t0).toFixed(2) + ' mlsec;');

        //After attaches
        _options.afterAttaches.apply(_this, args);
      } else{
        _this.log('Called attach but no DOM elements to attach');
      }
    };

    this.detach = function(context, settings){

      if(!(_options.detach instanceof Function)){
        _this.log('Detach is called but it\'s not defined.');
        return;
      }

      var $context  = jQuery(context),
        $$context = $context[0];

      if(!$context.length){
        _this.logWarn('Trying to detach. Context is empty!');
        return;
      }

      var el,
        DOMElementsToDetach  = [],
        DOMElementsInContext = [],
        DOMElements          = jQuery(_options.selector),
        detachedWithSuccess  = 0,
        detachedWithError    = 0,
        args                 = [$context, settings, _this];

      for(i = 0; i < DOMElements.length; i++){
        el = DOMElements.eq(i);

        if(jQuery.contains($$context, el[0])){
          DOMElementsInContext.push(el[0]);
        }

        if($context[0] === el[0]){
          DOMElementsInContext.push(el[0]);
        }
      }

      for(i = 0; i < DOMElementsInContext.length; i++){
        el = DOMElementsInContext[i];

        if(el[_isAttachedKey]){
          DOMElementsToDetach.push(el);
        }
      }

      if(DOMElementsToDetach.length){
        _this.log('Start detach.\n' + 'Detaching: ' + DOMElementsToDetach.length + ' DOM element(s);');

        var t0 = _performance.now();

        for(var i = 0; i < DOMElementsToDetach.length; i++){
          el = DOMElementsToDetach[i];

          try {
            _options.detach.apply(el, args);

            delete el[_isAttachedKey];
            detachedWithSuccess++;
            $(el).removeClass(_DJ.themeName + '__' + _options.name + '__processedWithError ' + _DJ.themeName + '__' + _options.name + '__processed');

          } catch (err){
            detachedWithError++;
            _this.logError('\n', err.stack);
            $(el).removeClass(_DJ.themeName + '__' + _options.name + '__processedWithError ' + _DJ.themeName + '__' + _options.name + '__processed');
          }
        }

        var t1 = _performance.now();

        _this.log('End detach.\n'   +
          'Detached with success: ' + detachedWithSuccess + ' DOM element(s);\n' +
          'Detached with error:   ' + detachedWithError + ' DOM element(s);\n' +
          'Execution time:        ' + (t1 - t0).toFixed(2) + ' milliseconds;');

      } else{
        _this.log('Called detach but no DOM elements to detach');
      }
    };

    this.getNotAttachedElements = function(){
      return document.querySelectorAll(_options.selector + ':not(.' + (_DJ.themeName + '__' + _options.name + '__processed)'));
    };

    this.getAttachedElements = function(){
      return document.querySelectorAll(_options.selector + '.' + (_DJ.themeName + '__' + _options.name + '__processed'));
    };

    this.getElements = function(){
      return document.querySelectorAll(_options.selector);
    };

    this.isAttachedTo = function(domElement){
      return _DJ.isAttaced(_options.name, domElement);
    };

    if(!(_options.attach instanceof Function)){
      _this.logWarn('Attach method is not defined!');
    }

    DJBehavior.prototype.on = function(eventName, callback, callbackArgs){
      //TODO
    };

    DJBehavior.prototype.trigger = function(){
      //TODO
    };
  };


  /**
   * Class DJEvent
   * */

  function DJEvent(options){
    //TODO
    var _options = {
      eventName:     'DJEvent'
    };

    options = options ? options : {};

    _options = _extendObject(_options, options);
    _extendObject(this, _options);
  };


  /**
   * Class DJStarage
   * */

  function DJStorage(){
    var _storage       = {},
      _eventHandlers = {};

    this.set = function(key, value){
      if(!key){
        _logWarn('[Storage] [set] Argument \'key\' is not set');
        return false;
      }

      var prevValue = _storage[key];

      if(prevValue === value){
        return false;
      }

      _storage[key] = value;

      var handlers = _eventHandlers[key];
      if(handlers) {
        var handler,
          eventObject = new DJEvent({
            eventName: 'DJStorageChange',
            key:       key,
            prevValue: prevValue,
            value:     value
          });

        for(var i = 0; i < handlers.length; i++){
          handler = handlers[i];
          handler.callback.apply(handler.context, [eventObject]);
        }
      }

      return true;
    };

    this.get = function(key){
      return _storage[key];
    };

    this.onChange = function(key, callback, context){
      if(!key || !(callback instanceof Function)){
        _logWarn('[Storage] [onChange] Wrong arguments!' +
          '\nkey: ' + key +
          '\ncallback: ' + callback +
          '\ncontext: ' + context);
        return false;
      }

      var context = context ? context : window;
      var key     = key + '';

      if(!(key in _eventHandlers)){
        _eventHandlers[key] = [];
      }

      _eventHandlers[key].push({
        key:      key,
        callback: callback,
        context:  context,
      });

      return true;
    };

    this.offChange = function(key, callback){
      if(!key){
        _logWarn('[Starage] [offChange] Wrong argument \'key\'!' +
          '\nkey: ' + key);
        return false;
      }

      if(callback && !(callback instanceof Function)){
        _logWarn('[Starage] [offChange] Wrong argument \'callback\'! It is not a function');
        return false;
      }

      if(!callback){
        delete _eventHandlers[key];
      }

      var handlers  = _eventHandlers[key],
        newHandlers = [],
        handler;

      for(var i = 0; i < handlers.length; i++){
        handler = handlers[i];
        if(handler.callback !== callback){
          newHandlers.push(handler);
        }
      }

      _eventHandlers[key] = newHandlers;

      return true;
    };

    this.trigger = function(key){
      if(!key){
        _logWarn('[Storage] Trigger needs argument \'key\'');
        return false;
      }

      if(!(key in _eventHandlers)){
        return false;
      }

      var value = _storage[key];

      var handlers  = _eventHandlers[key],
        handler,
        eventObject = new DJEvent({
          eventName: 'DJStorageChange',
          key:       key,
          prevValue: value,
          value:     value
        });

      for(var i = 0; i < handlers.length; i++){
        handler = handlers[i];
        handler.callback.apply(handler.context, [eventObject]);
      }

      return true;
    };
  };


  /**
   * Class DJEvent
   * */

  function DJBreakpoints(list){
    if(!window.matchMedia && !window.msMatchMedia && !(_DJ.browser.name == 'msie' && _DJ.browser.version == '9')){
      _DJ.isMediaSupported = false;
      this.name           = 'none';
      return false;
    }

    _DJ.isMediaSupported = true;

    if(typeof(list) == 'object'){
      _init(list);
    }

    var _this = this,
      mediaTpl = '@media screen and (min-width: {{min_width}}px){#dj-breakpoint-indicator:before{content:"{{bp_name}}";}}',
      _breakpoints = list,
      _currentBp,
      _beforeEl,
      _timerId;

    function _init(list){
      if(!_DJ.isDOMReady){
        _DJ.on('DOMReady', function(){
          _init(list);
        });
        return;
      }

      _addMediaStyles(list);
      _breakpoints = list;

      window.addEventListener('resize', function(){
        clearTimeout(_timerId);
        _timerId = setTimeout(_checkBreakpoint, 50);
      });
      _checkBreakpoint();

      return true;
    };

    function _addMediaStyles(){
      _removeMediaStyles();

      var s         = document.createElement('style'),
        el        = document.createElement('div'),
        media     = '',
        innerHTML = '#dj-breakpoint-indicator{display:block;width:0;height:0;overflow:hidden;}';
      s.id  = "dj-breakpoint-styles";
      el.id = "dj-breakpoint-indicator";

      for(var name in list){
        media = mediaTpl.replace('{{bp_name}}', name);
        media = media.replace('{{min_width}}', list[name]);
        innerHTML += media + ' ';
      }

      document.body.appendChild(el);

      s.innerHTML = innerHTML;
      document.head.appendChild(s);
      _beforeEl = window.getComputedStyle ? window.getComputedStyle(el, ':before') : false;
    };

    function _removeMediaStyles(){
      var el = document.getElementById('dj-breakpoint-styles');
      el && document.head.removeChild(el)
    }

    function _checkBreakpoint(){
      if(!_breakpoints){
        return;
      }

      var _prevBp = _currentBp;
      _currentBp  = _beforeEl.getPropertyValue('content').replace(/"/g, '').replace(/'/g, '');

      if (_currentBp !== _prevBp) {
        _this.name = _currentBp;
        var eventObj = new DJEvent({
          eventName:      'changeBreakpoint',
          breakpoint:     _currentBp,
          prevBreakpoint: _prevBp
        });

        _log('[Breakpoints] Changed to \'' + _this.name + '\'');

        _DJ.trigger('changeBreakpoint.'+_currentBp, eventObj);
        _DJ.trigger('changeBreakpoint', eventObj);
      }
    };
  };


  /**
   * Support functions
   * */

  function _log(){
    if (_DJ.env == 'dev') {
      var args = Array.prototype.slice.call(arguments);
      var time = new Date();
      time = time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ':' + time.getMilliseconds();
      args.unshift('\n[Theme: ' + _options.themeName + ']');
      args.unshift(time);
      _console.log.apply(_console, args);
    }
  };

  function _logError(){
    var args = Array.prototype.slice.call(arguments);
    var time = new Date();
    time = time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ':' + time.getMilliseconds();
    args.unshift('\n[Theme: ' + _options.themeName + ']');
    args.unshift(time);
    _console[_console.error ? 'error' : 'log'].apply(_console, args);
  };

  function _logWarn(){
    if (_DJ.env == 'dev') {
      var args = Array.prototype.slice.call(arguments);
      var time = new Date();
      time = time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ':' + time.getMilliseconds();
      args.unshift('\n[Theme: ' + _options.themeName + ']');
      args.unshift(time);
      _console[_console.warn ? 'warn' : 'log'].apply(_console, args);
    }
  };

  function _logInfo(){
    if (_DJ.env == 'dev') {
      var args = Array.prototype.slice.call(arguments);
      var time = new Date();
      time = time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ':' + time.getMilliseconds();
      args.unshift('\n[Theme: ' + _options.themeName + ']');
      args.unshift(time);
      _console[_console.info ? 'info' : 'log'].apply(_console, args);
    }
  };

  function _detectTouch(){
    var isTouchScreen;

    if (('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0)) {
      isTouchScreen = true;
    }

    document.documentElement.className += ' ' + _options.classPrefix + (isTouchScreen ? '' : 'no-')  + 'touch';

    return isTouchScreen;
  };

  function _detectBrowser(){
    var browser = (function(){
      var ua= navigator.userAgent, tem,
        M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
      if(/trident/i.test(M[1])){
        tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
        //return 'IE '+(tem[1] || '');
        return {name: 'msie', version: (tem[1] || '')};
      }
      if(M[1]=== 'Chrome'){
        tem= ua.match(/\bOPR\/(\d+)/)
        //if(tem!= null) return 'Opera '+tem[1];
        if(tem!= null) return {name: 'opera', version: (tem[1] || '')};
      }
      M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
      if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
      return {name: M[0].toLowerCase(), version: M[1]};
    })();

    document.documentElement.className += ' ' + _options.classPrefix + 'browser-' + browser.name;
    document.documentElement.className += ' ' + _options.classPrefix + 'browser-' + browser.name + '-' + browser.version;

    return {
      name:    browser.name,
      version: browser.version
    };
  };

  function _detectDevice(){
    var check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);




    document.documentElement.className += ' ' + _options.classPrefix + (check ? 'device' : 'no-device');

    return check;
  };

  function _removeDesktopStylesOnDevice(){
    if(_DJ.isDevice){
      var desktopStylesheet = document.getElementById('dj-desktop-styles');
      desktopStylesheet && (desktopStylesheet.disabled = true);
    }
  };

  function _extendObject(obj1, obj2) {
    for (var prop in obj2) {
      obj1[prop] = obj2[prop];
    }

    return obj1;
  };

  function _watchDOMReady(){
    if(document.readyState === "complete"){
      _onDOMReady();
      return;
    }

    jQuery(function(){
      _onDOMReady();
    });
  };

  function _onDOMReady(){
    if(document.addEventListener) {
      document.removeEventListener("DOMContentLoaded", _onDOMReady);
      window.removeEventListener("load", _onDOMReady, false);
    } else if ( document.attachEvent ) {
      window.detachEvent("load", _onDOMReady);
    }

    _DJ.isDOMReady = true;
    _DJ.trigger('DOMReady');
    _DJ.trigger('afterDOMReady');
  };

  function _getDrupalSettings(){
    var settings = window.drupalSettings ? window.drupalSettings : (window.Drupal.settings ? window.Drupal.settings: {});
    return settings;
  }

  /**
   * If Drupal is not available - we are in slice enviroment.
   * */

  if (!window.Drupal) {

    window.Drupal = {
      settings: {
        isSlicingEnvironment: true
      },
      behaviors: {},
      t: function (text, args) {
        if(args){
          for(var prop in args){
            text = text.replace(prop, args[prop]);
          }
        }
        return text;
      }
    };

    if(!window.drupalSettings){
      window.drupalSettings = {
        isSlicingEnvironment: true
      };
    } else{
      window.drupalSettings.isSlicingEnvironment = true;
    }

    Drupal.attachBehaviors = function (context, settings) {
      context  = context || document;
      settings = settings || _getDrupalSettings();
      _DJ.attachAllBehaviors(context, settings);
    };

    Drupal.detachBehaviors = function (context, settings) {
      context  = context || document;
      settings = settings || _getDrupalSettings();
      _DJ.detachAllBehaviors(context, settings);
    };

    if(_DJ.isDOMReady){
      _DJ.attachAllBehaviors(document, _getDrupalSettings());
    }else{
      _DJ.on('afterDOMReady', function(){
        _DJ.attachAllBehaviors(document, _getDrupalSettings());
      });
    }
  }

})();
