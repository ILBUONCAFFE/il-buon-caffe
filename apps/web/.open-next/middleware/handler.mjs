
import {Buffer} from "node:buffer";
globalThis.Buffer = Buffer;

import {AsyncLocalStorage} from "node:async_hooks";
globalThis.AsyncLocalStorage = AsyncLocalStorage;


const defaultDefineProperty = Object.defineProperty;
Object.defineProperty = function(o, p, a) {
  if(p=== '__import_unsupported' && Boolean(globalThis.__import_unsupported)) {
    return;
  }
  return defaultDefineProperty(o, p, a);
};

  
  
  globalThis.openNextDebug = false;globalThis.openNextVersion = "3.9.16";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../node_modules/@opennextjs/aws/dist/utils/error.js
function isOpenNextError(e) {
  try {
    return "__openNextInternal" in e;
  } catch {
    return false;
  }
}
var init_error = __esm({
  "../../node_modules/@opennextjs/aws/dist/utils/error.js"() {
  }
});

// ../../node_modules/@opennextjs/aws/dist/adapters/logger.js
function debug(...args) {
  if (globalThis.openNextDebug) {
    console.log(...args);
  }
}
function warn(...args) {
  console.warn(...args);
}
function error(...args) {
  if (args.some((arg) => isDownplayedErrorLog(arg))) {
    return debug(...args);
  }
  if (args.some((arg) => isOpenNextError(arg))) {
    const error2 = args.find((arg) => isOpenNextError(arg));
    if (error2.logLevel < getOpenNextErrorLogLevel()) {
      return;
    }
    if (error2.logLevel === 0) {
      return console.log(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    if (error2.logLevel === 1) {
      return warn(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    return console.error(...args);
  }
  console.error(...args);
}
function getOpenNextErrorLogLevel() {
  const strLevel = process.env.OPEN_NEXT_ERROR_LOG_LEVEL ?? "1";
  switch (strLevel.toLowerCase()) {
    case "debug":
    case "0":
      return 0;
    case "error":
    case "2":
      return 2;
    default:
      return 1;
  }
}
var DOWNPLAYED_ERROR_LOGS, isDownplayedErrorLog;
var init_logger = __esm({
  "../../node_modules/@opennextjs/aws/dist/adapters/logger.js"() {
    init_error();
    DOWNPLAYED_ERROR_LOGS = [
      {
        clientName: "S3Client",
        commandName: "GetObjectCommand",
        errorName: "NoSuchKey"
      }
    ];
    isDownplayedErrorLog = (errorLog) => DOWNPLAYED_ERROR_LOGS.some((downplayedInput) => downplayedInput.clientName === errorLog?.clientName && downplayedInput.commandName === errorLog?.commandName && (downplayedInput.errorName === errorLog?.error?.name || downplayedInput.errorName === errorLog?.error?.Code));
  }
});

// ../../node_modules/cookie/dist/index.js
var require_dist = __commonJS({
  "../../node_modules/cookie/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseCookie = parseCookie;
    exports.parse = parseCookie;
    exports.stringifyCookie = stringifyCookie;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    exports.parseSetCookie = parseSetCookie;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    var cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/;
    var cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/;
    var domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    var pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
    var maxAgeRegExp = /^-?\d+$/;
    var __toString = Object.prototype.toString;
    var NullObject = /* @__PURE__ */ (() => {
      const C = function() {
      };
      C.prototype = /* @__PURE__ */ Object.create(null);
      return C;
    })();
    function parseCookie(str, options) {
      const obj = new NullObject();
      const len = str.length;
      if (len < 2)
        return obj;
      const dec = options?.decode || decode;
      let index = 0;
      do {
        const eqIdx = eqIndex(str, index, len);
        if (eqIdx === -1)
          break;
        const endIdx = endIndex(str, index, len);
        if (eqIdx > endIdx) {
          index = str.lastIndexOf(";", eqIdx - 1) + 1;
          continue;
        }
        const key = valueSlice(str, index, eqIdx);
        if (obj[key] === void 0) {
          obj[key] = dec(valueSlice(str, eqIdx + 1, endIdx));
        }
        index = endIdx + 1;
      } while (index < len);
      return obj;
    }
    function stringifyCookie(cookie, options) {
      const enc = options?.encode || encodeURIComponent;
      const cookieStrings = [];
      for (const name of Object.keys(cookie)) {
        const val = cookie[name];
        if (val === void 0)
          continue;
        if (!cookieNameRegExp.test(name)) {
          throw new TypeError(`cookie name is invalid: ${name}`);
        }
        const value = enc(val);
        if (!cookieValueRegExp.test(value)) {
          throw new TypeError(`cookie val is invalid: ${val}`);
        }
        cookieStrings.push(`${name}=${value}`);
      }
      return cookieStrings.join("; ");
    }
    function stringifySetCookie(_name, _val, _opts) {
      const cookie = typeof _name === "object" ? _name : { ..._opts, name: _name, value: String(_val) };
      const options = typeof _val === "object" ? _val : _opts;
      const enc = options?.encode || encodeURIComponent;
      if (!cookieNameRegExp.test(cookie.name)) {
        throw new TypeError(`argument name is invalid: ${cookie.name}`);
      }
      const value = cookie.value ? enc(cookie.value) : "";
      if (!cookieValueRegExp.test(value)) {
        throw new TypeError(`argument val is invalid: ${cookie.value}`);
      }
      let str = cookie.name + "=" + value;
      if (cookie.maxAge !== void 0) {
        if (!Number.isInteger(cookie.maxAge)) {
          throw new TypeError(`option maxAge is invalid: ${cookie.maxAge}`);
        }
        str += "; Max-Age=" + cookie.maxAge;
      }
      if (cookie.domain) {
        if (!domainValueRegExp.test(cookie.domain)) {
          throw new TypeError(`option domain is invalid: ${cookie.domain}`);
        }
        str += "; Domain=" + cookie.domain;
      }
      if (cookie.path) {
        if (!pathValueRegExp.test(cookie.path)) {
          throw new TypeError(`option path is invalid: ${cookie.path}`);
        }
        str += "; Path=" + cookie.path;
      }
      if (cookie.expires) {
        if (!isDate(cookie.expires) || !Number.isFinite(cookie.expires.valueOf())) {
          throw new TypeError(`option expires is invalid: ${cookie.expires}`);
        }
        str += "; Expires=" + cookie.expires.toUTCString();
      }
      if (cookie.httpOnly) {
        str += "; HttpOnly";
      }
      if (cookie.secure) {
        str += "; Secure";
      }
      if (cookie.partitioned) {
        str += "; Partitioned";
      }
      if (cookie.priority) {
        const priority = typeof cookie.priority === "string" ? cookie.priority.toLowerCase() : void 0;
        switch (priority) {
          case "low":
            str += "; Priority=Low";
            break;
          case "medium":
            str += "; Priority=Medium";
            break;
          case "high":
            str += "; Priority=High";
            break;
          default:
            throw new TypeError(`option priority is invalid: ${cookie.priority}`);
        }
      }
      if (cookie.sameSite) {
        const sameSite = typeof cookie.sameSite === "string" ? cookie.sameSite.toLowerCase() : cookie.sameSite;
        switch (sameSite) {
          case true:
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError(`option sameSite is invalid: ${cookie.sameSite}`);
        }
      }
      return str;
    }
    function parseSetCookie(str, options) {
      const dec = options?.decode || decode;
      const len = str.length;
      const endIdx = endIndex(str, 0, len);
      const eqIdx = eqIndex(str, 0, endIdx);
      const setCookie = eqIdx === -1 ? { name: "", value: dec(valueSlice(str, 0, endIdx)) } : {
        name: valueSlice(str, 0, eqIdx),
        value: dec(valueSlice(str, eqIdx + 1, endIdx))
      };
      let index = endIdx + 1;
      while (index < len) {
        const endIdx2 = endIndex(str, index, len);
        const eqIdx2 = eqIndex(str, index, endIdx2);
        const attr = eqIdx2 === -1 ? valueSlice(str, index, endIdx2) : valueSlice(str, index, eqIdx2);
        const val = eqIdx2 === -1 ? void 0 : valueSlice(str, eqIdx2 + 1, endIdx2);
        switch (attr.toLowerCase()) {
          case "httponly":
            setCookie.httpOnly = true;
            break;
          case "secure":
            setCookie.secure = true;
            break;
          case "partitioned":
            setCookie.partitioned = true;
            break;
          case "domain":
            setCookie.domain = val;
            break;
          case "path":
            setCookie.path = val;
            break;
          case "max-age":
            if (val && maxAgeRegExp.test(val))
              setCookie.maxAge = Number(val);
            break;
          case "expires":
            if (!val)
              break;
            const date = new Date(val);
            if (Number.isFinite(date.valueOf()))
              setCookie.expires = date;
            break;
          case "priority":
            if (!val)
              break;
            const priority = val.toLowerCase();
            if (priority === "low" || priority === "medium" || priority === "high") {
              setCookie.priority = priority;
            }
            break;
          case "samesite":
            if (!val)
              break;
            const sameSite = val.toLowerCase();
            if (sameSite === "lax" || sameSite === "strict" || sameSite === "none") {
              setCookie.sameSite = sameSite;
            }
            break;
        }
        index = endIdx2 + 1;
      }
      return setCookie;
    }
    function endIndex(str, min, len) {
      const index = str.indexOf(";", min);
      return index === -1 ? len : index;
    }
    function eqIndex(str, min, max) {
      const index = str.indexOf("=", min);
      return index < max ? index : -1;
    }
    function valueSlice(str, min, max) {
      let start = min;
      let end = max;
      do {
        const code = str.charCodeAt(start);
        if (code !== 32 && code !== 9)
          break;
      } while (++start < end);
      while (end > start) {
        const code = str.charCodeAt(end - 1);
        if (code !== 32 && code !== 9)
          break;
        end--;
      }
      return str.slice(start, end);
    }
    function decode(str) {
      if (str.indexOf("%") === -1)
        return str;
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    }
    function isDate(val) {
      return __toString.call(val) === "[object Date]";
    }
  }
});

// ../../node_modules/@opennextjs/aws/dist/http/util.js
function parseSetCookieHeader(cookies) {
  if (!cookies) {
    return [];
  }
  if (typeof cookies === "string") {
    return cookies.split(/(?<!Expires=\w+),/i).map((c) => c.trim());
  }
  return cookies;
}
function getQueryFromIterator(it) {
  const query = {};
  for (const [key, value] of it) {
    if (key in query) {
      if (Array.isArray(query[key])) {
        query[key].push(value);
      } else {
        query[key] = [query[key], value];
      }
    } else {
      query[key] = value;
    }
  }
  return query;
}
var init_util = __esm({
  "../../node_modules/@opennextjs/aws/dist/http/util.js"() {
    init_logger();
  }
});

// ../../node_modules/@opennextjs/aws/dist/overrides/converters/utils.js
function getQueryFromSearchParams(searchParams) {
  return getQueryFromIterator(searchParams.entries());
}
var init_utils = __esm({
  "../../node_modules/@opennextjs/aws/dist/overrides/converters/utils.js"() {
    init_util();
  }
});

// ../../node_modules/@opennextjs/aws/dist/overrides/converters/edge.js
var edge_exports = {};
__export(edge_exports, {
  default: () => edge_default
});
import { Buffer as Buffer2 } from "node:buffer";
var import_cookie, NULL_BODY_STATUSES, converter, edge_default;
var init_edge = __esm({
  "../../node_modules/@opennextjs/aws/dist/overrides/converters/edge.js"() {
    import_cookie = __toESM(require_dist(), 1);
    init_util();
    init_utils();
    NULL_BODY_STATUSES = /* @__PURE__ */ new Set([101, 103, 204, 205, 304]);
    converter = {
      convertFrom: async (event) => {
        const url = new URL(event.url);
        const searchParams = url.searchParams;
        const query = getQueryFromSearchParams(searchParams);
        const headers = {};
        event.headers.forEach((value, key) => {
          headers[key] = value;
        });
        const rawPath = url.pathname;
        const method = event.method;
        const shouldHaveBody = method !== "GET" && method !== "HEAD";
        const body = shouldHaveBody ? Buffer2.from(await event.arrayBuffer()) : void 0;
        const cookieHeader = event.headers.get("cookie");
        const cookies = cookieHeader ? import_cookie.default.parse(cookieHeader) : {};
        return {
          type: "core",
          method,
          rawPath,
          url: event.url,
          body,
          headers,
          remoteAddress: event.headers.get("x-forwarded-for") ?? "::1",
          query,
          cookies
        };
      },
      convertTo: async (result) => {
        if ("internalEvent" in result) {
          const request = new Request(result.internalEvent.url, {
            body: result.internalEvent.body,
            method: result.internalEvent.method,
            headers: {
              ...result.internalEvent.headers,
              "x-forwarded-host": result.internalEvent.headers.host
            }
          });
          if (globalThis.__dangerous_ON_edge_converter_returns_request === true) {
            return request;
          }
          const cfCache = (result.isISR || result.internalEvent.rawPath.startsWith("/_next/image")) && process.env.DISABLE_CACHE !== "true" ? { cacheEverything: true } : {};
          return fetch(request, {
            // This is a hack to make sure that the response is cached by Cloudflare
            // See https://developers.cloudflare.com/workers/examples/cache-using-fetch/#caching-html-resources
            // @ts-expect-error - This is a Cloudflare specific option
            cf: cfCache
          });
        }
        const headers = new Headers();
        for (const [key, value] of Object.entries(result.headers)) {
          if (key === "set-cookie" && typeof value === "string") {
            const cookies = parseSetCookieHeader(value);
            for (const cookie of cookies) {
              headers.append(key, cookie);
            }
            continue;
          }
          if (Array.isArray(value)) {
            for (const v of value) {
              headers.append(key, v);
            }
          } else {
            headers.set(key, value);
          }
        }
        const body = NULL_BODY_STATUSES.has(result.statusCode) ? null : result.body;
        return new Response(body, {
          status: result.statusCode,
          headers
        });
      },
      name: "edge"
    };
    edge_default = converter;
  }
});

// ../../node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-edge.js
var cloudflare_edge_exports = {};
__export(cloudflare_edge_exports, {
  default: () => cloudflare_edge_default
});
var cfPropNameMapping, handler, cloudflare_edge_default;
var init_cloudflare_edge = __esm({
  "../../node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-edge.js"() {
    cfPropNameMapping = {
      // The city name is percent-encoded.
      // See https://github.com/vercel/vercel/blob/4cb6143/packages/functions/src/headers.ts#L94C19-L94C37
      city: [encodeURIComponent, "x-open-next-city"],
      country: "x-open-next-country",
      regionCode: "x-open-next-region",
      latitude: "x-open-next-latitude",
      longitude: "x-open-next-longitude"
    };
    handler = async (handler3, converter2) => async (request, env, ctx) => {
      globalThis.process = process;
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === "string") {
          process.env[key] = value;
        }
      }
      const internalEvent = await converter2.convertFrom(request);
      const cfProperties = request.cf;
      for (const [propName, mapping] of Object.entries(cfPropNameMapping)) {
        const propValue = cfProperties?.[propName];
        if (propValue != null) {
          const [encode, headerName] = Array.isArray(mapping) ? mapping : [null, mapping];
          internalEvent.headers[headerName] = encode ? encode(propValue) : propValue;
        }
      }
      const response = await handler3(internalEvent, {
        waitUntil: ctx.waitUntil.bind(ctx)
      });
      const result = await converter2.convertTo(response);
      return result;
    };
    cloudflare_edge_default = {
      wrapper: handler,
      name: "cloudflare-edge",
      supportStreaming: true,
      edgeRuntime: true
    };
  }
});

// ../../node_modules/@opennextjs/aws/dist/overrides/originResolver/pattern-env.js
var pattern_env_exports = {};
__export(pattern_env_exports, {
  default: () => pattern_env_default
});
function initializeOnce() {
  if (initialized)
    return;
  cachedOrigins = JSON.parse(process.env.OPEN_NEXT_ORIGIN ?? "{}");
  const functions = globalThis.openNextConfig.functions ?? {};
  for (const key in functions) {
    if (key !== "default") {
      const value = functions[key];
      const regexes = [];
      for (const pattern of value.patterns) {
        const regexPattern = `/${pattern.replace(/\*\*/g, "(.*)").replace(/\*/g, "([^/]*)").replace(/\//g, "\\/").replace(/\?/g, ".")}`;
        regexes.push(new RegExp(regexPattern));
      }
      cachedPatterns.push({
        key,
        patterns: value.patterns,
        regexes
      });
    }
  }
  initialized = true;
}
var cachedOrigins, cachedPatterns, initialized, envLoader, pattern_env_default;
var init_pattern_env = __esm({
  "../../node_modules/@opennextjs/aws/dist/overrides/originResolver/pattern-env.js"() {
    init_logger();
    cachedPatterns = [];
    initialized = false;
    envLoader = {
      name: "env",
      resolve: async (_path) => {
        try {
          initializeOnce();
          for (const { key, patterns, regexes } of cachedPatterns) {
            for (const regex of regexes) {
              if (regex.test(_path)) {
                debug("Using origin", key, patterns);
                return cachedOrigins[key];
              }
            }
          }
          if (_path.startsWith("/_next/image") && cachedOrigins.imageOptimizer) {
            debug("Using origin", "imageOptimizer", _path);
            return cachedOrigins.imageOptimizer;
          }
          if (cachedOrigins.default) {
            debug("Using default origin", cachedOrigins.default, _path);
            return cachedOrigins.default;
          }
          return false;
        } catch (e) {
          error("Error while resolving origin", e);
          return false;
        }
      }
    };
    pattern_env_default = envLoader;
  }
});

// ../../node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js
var dummy_exports = {};
__export(dummy_exports, {
  default: () => dummy_default
});
var resolver, dummy_default;
var init_dummy = __esm({
  "../../node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js"() {
    resolver = {
      name: "dummy"
    };
    dummy_default = resolver;
  }
});

// ../../node_modules/@opennextjs/aws/dist/utils/stream.js
import { ReadableStream } from "node:stream/web";
function toReadableStream(value, isBase64) {
  return new ReadableStream({
    pull(controller) {
      controller.enqueue(Buffer.from(value, isBase64 ? "base64" : "utf8"));
      controller.close();
    }
  }, { highWaterMark: 0 });
}
function emptyReadableStream() {
  if (process.env.OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE === "true") {
    return new ReadableStream({
      pull(controller) {
        maybeSomethingBuffer ??= Buffer.from("SOMETHING");
        controller.enqueue(maybeSomethingBuffer);
        controller.close();
      }
    }, { highWaterMark: 0 });
  }
  return new ReadableStream({
    start(controller) {
      controller.close();
    }
  });
}
var maybeSomethingBuffer;
var init_stream = __esm({
  "../../node_modules/@opennextjs/aws/dist/utils/stream.js"() {
  }
});

// ../../node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js
var fetch_exports = {};
__export(fetch_exports, {
  default: () => fetch_default
});
var fetchProxy, fetch_default;
var init_fetch = __esm({
  "../../node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js"() {
    init_stream();
    fetchProxy = {
      name: "fetch-proxy",
      // @ts-ignore
      proxy: async (internalEvent) => {
        const { url, headers: eventHeaders, method, body } = internalEvent;
        const headers = Object.fromEntries(Object.entries(eventHeaders).filter(([key]) => key.toLowerCase() !== "cf-connecting-ip"));
        const response = await fetch(url, {
          method,
          headers,
          body
        });
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        return {
          type: "core",
          headers: responseHeaders,
          statusCode: response.status,
          isBase64Encoded: true,
          body: response.body ?? emptyReadableStream()
        };
      }
    };
    fetch_default = fetchProxy;
  }
});

// .next/server/edge-runtime-webpack.js
var require_edge_runtime_webpack = __commonJS({
  ".next/server/edge-runtime-webpack.js"() {
    "use strict";
    (() => {
      "use strict";
      var a, b, c, d, e = {}, f = {};
      function g(a2) {
        var b2 = f[a2];
        if (void 0 !== b2) return b2.exports;
        var c2 = f[a2] = { exports: {} }, d2 = true;
        try {
          e[a2](c2, c2.exports, g), d2 = false;
        } finally {
          d2 && delete f[a2];
        }
        return c2.exports;
      }
      g.m = e, g.amdO = {}, a = [], g.O = (b2, c2, d2, e2) => {
        if (c2) {
          e2 = e2 || 0;
          for (var f2 = a.length; f2 > 0 && a[f2 - 1][2] > e2; f2--) a[f2] = a[f2 - 1];
          a[f2] = [c2, d2, e2];
          return;
        }
        for (var h = 1 / 0, f2 = 0; f2 < a.length; f2++) {
          for (var [c2, d2, e2] = a[f2], i = true, j = 0; j < c2.length; j++) (false & e2 || h >= e2) && Object.keys(g.O).every((a2) => g.O[a2](c2[j])) ? c2.splice(j--, 1) : (i = false, e2 < h && (h = e2));
          if (i) {
            a.splice(f2--, 1);
            var k = d2();
            void 0 !== k && (b2 = k);
          }
        }
        return b2;
      }, g.n = (a2) => {
        var b2 = a2 && a2.__esModule ? () => a2.default : () => a2;
        return g.d(b2, { a: b2 }), b2;
      }, g.d = (a2, b2) => {
        for (var c2 in b2) g.o(b2, c2) && !g.o(a2, c2) && Object.defineProperty(a2, c2, { enumerable: true, get: b2[c2] });
      }, g.g = function() {
        if ("object" == typeof globalThis) return globalThis;
        try {
          return this || Function("return this")();
        } catch (a2) {
          if ("object" == typeof window) return window;
        }
      }(), g.o = (a2, b2) => Object.prototype.hasOwnProperty.call(a2, b2), g.r = (a2) => {
        "u" > typeof Symbol && Symbol.toStringTag && Object.defineProperty(a2, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(a2, "__esModule", { value: true });
      }, b = { 149: 0 }, g.O.j = (a2) => 0 === b[a2], c = (a2, c2) => {
        var d2, e2, [f2, h, i] = c2, j = 0;
        if (f2.some((a3) => 0 !== b[a3])) {
          for (d2 in h) g.o(h, d2) && (g.m[d2] = h[d2]);
          if (i) var k = i(g);
        }
        for (a2 && a2(c2); j < f2.length; j++) e2 = f2[j], g.o(b, e2) && b[e2] && b[e2][0](), b[e2] = 0;
        return g.O(k);
      }, (d = self.webpackChunk_N_E = self.webpackChunk_N_E || []).forEach(c.bind(null, 0)), d.push = c.bind(null, d.push.bind(d));
    })();
  }
});

// node-built-in-modules:node:buffer
var node_buffer_exports = {};
import * as node_buffer_star from "node:buffer";
var init_node_buffer = __esm({
  "node-built-in-modules:node:buffer"() {
    __reExport(node_buffer_exports, node_buffer_star);
  }
});

// node-built-in-modules:node:async_hooks
var node_async_hooks_exports = {};
import * as node_async_hooks_star from "node:async_hooks";
var init_node_async_hooks = __esm({
  "node-built-in-modules:node:async_hooks"() {
    __reExport(node_async_hooks_exports, node_async_hooks_star);
  }
});

// .next/server/src/middleware.js
var require_middleware = __commonJS({
  ".next/server/src/middleware.js"() {
    "use strict";
    (self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([[550], { 26: (a) => {
      (() => {
        "use strict";
        "u" > typeof __nccwpck_require__ && (__nccwpck_require__.ab = "//");
        var b, c, d, e, f = {};
        f.parse = function(a2, c2) {
          if ("string" != typeof a2) throw TypeError("argument str must be a string");
          for (var e2 = {}, f2 = a2.split(d), g = (c2 || {}).decode || b, h = 0; h < f2.length; h++) {
            var i = f2[h], j = i.indexOf("=");
            if (!(j < 0)) {
              var k = i.substr(0, j).trim(), l = i.substr(++j, i.length).trim();
              '"' == l[0] && (l = l.slice(1, -1)), void 0 == e2[k] && (e2[k] = function(a3, b2) {
                try {
                  return b2(a3);
                } catch (b3) {
                  return a3;
                }
              }(l, g));
            }
          }
          return e2;
        }, f.serialize = function(a2, b2, d2) {
          var f2 = d2 || {}, g = f2.encode || c;
          if ("function" != typeof g) throw TypeError("option encode is invalid");
          if (!e.test(a2)) throw TypeError("argument name is invalid");
          var h = g(b2);
          if (h && !e.test(h)) throw TypeError("argument val is invalid");
          var i = a2 + "=" + h;
          if (null != f2.maxAge) {
            var j = f2.maxAge - 0;
            if (isNaN(j) || !isFinite(j)) throw TypeError("option maxAge is invalid");
            i += "; Max-Age=" + Math.floor(j);
          }
          if (f2.domain) {
            if (!e.test(f2.domain)) throw TypeError("option domain is invalid");
            i += "; Domain=" + f2.domain;
          }
          if (f2.path) {
            if (!e.test(f2.path)) throw TypeError("option path is invalid");
            i += "; Path=" + f2.path;
          }
          if (f2.expires) {
            if ("function" != typeof f2.expires.toUTCString) throw TypeError("option expires is invalid");
            i += "; Expires=" + f2.expires.toUTCString();
          }
          if (f2.httpOnly && (i += "; HttpOnly"), f2.secure && (i += "; Secure"), f2.sameSite) switch ("string" == typeof f2.sameSite ? f2.sameSite.toLowerCase() : f2.sameSite) {
            case true:
            case "strict":
              i += "; SameSite=Strict";
              break;
            case "lax":
              i += "; SameSite=Lax";
              break;
            case "none":
              i += "; SameSite=None";
              break;
            default:
              throw TypeError("option sameSite is invalid");
          }
          return i;
        }, b = decodeURIComponent, c = encodeURIComponent, d = /; */, e = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/, a.exports = f;
      })();
    }, 57: (a, b, c) => {
      "use strict";
      let d, e, f;
      c.r(b), c.d(b, { default: () => b6 });
      var g, h, i, j, k, l, m, n, o, p, q, r, s = {};
      async function t() {
        return "_ENTRIES" in globalThis && _ENTRIES.middleware_instrumentation && await _ENTRIES.middleware_instrumentation;
      }
      c.r(s), c.d(s, { config: () => b1, middleware: () => b0 });
      let u = null;
      async function v() {
        if ("phase-production-build" === process.env.NEXT_PHASE) return;
        u || (u = t());
        let a10 = await u;
        if (null == a10 ? void 0 : a10.register) try {
          await a10.register();
        } catch (a11) {
          throw a11.message = `An error occurred while loading instrumentation hook: ${a11.message}`, a11;
        }
      }
      async function w(...a10) {
        let b7 = await t();
        try {
          var c2;
          await (null == b7 || null == (c2 = b7.onRequestError) ? void 0 : c2.call(b7, ...a10));
        } catch (a11) {
          console.error("Error in instrumentation.onRequestError:", a11);
        }
      }
      let x = null;
      function y() {
        return x || (x = v()), x;
      }
      function z(a10) {
        return `The edge runtime does not support Node.js '${a10}' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime`;
      }
      process !== c.g.process && (process.env = c.g.process.env, c.g.process = process);
      try {
        Object.defineProperty(globalThis, "__import_unsupported", { value: function(a10) {
          let b7 = new Proxy(function() {
          }, { get(b8, c2) {
            if ("then" === c2) return {};
            throw Object.defineProperty(Error(z(a10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          }, construct() {
            throw Object.defineProperty(Error(z(a10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          }, apply(c2, d2, e2) {
            if ("function" == typeof e2[0]) return e2[0](b7);
            throw Object.defineProperty(Error(z(a10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          } });
          return new Proxy({}, { get: () => b7 });
        }, enumerable: false, configurable: false });
      } catch {
      }
      y();
      class A extends Error {
        constructor({ page: a10 }) {
          super(`The middleware "${a10}" accepts an async API directly with the form:
  
  export function middleware(request, event) {
    return NextResponse.redirect('/new-location')
  }
  
  Read more: https://nextjs.org/docs/messages/middleware-new-signature
  `);
        }
      }
      class B extends Error {
        constructor() {
          super(`The request.page has been deprecated in favour of \`URLPattern\`.
  Read more: https://nextjs.org/docs/messages/middleware-request-page
  `);
        }
      }
      class C extends Error {
        constructor() {
          super(`The request.ua has been removed in favour of \`userAgent\` function.
  Read more: https://nextjs.org/docs/messages/middleware-parse-user-agent
  `);
        }
      }
      let D = "_N_T_", E = { shared: "shared", reactServerComponents: "rsc", serverSideRendering: "ssr", actionBrowser: "action-browser", apiNode: "api-node", apiEdge: "api-edge", middleware: "middleware", instrument: "instrument", edgeAsset: "edge-asset", appPagesBrowser: "app-pages-browser", pagesDirBrowser: "pages-dir-browser", pagesDirEdge: "pages-dir-edge", pagesDirNode: "pages-dir-node" };
      function F(a10) {
        var b7, c2, d2, e2, f2, g2 = [], h2 = 0;
        function i2() {
          for (; h2 < a10.length && /\s/.test(a10.charAt(h2)); ) h2 += 1;
          return h2 < a10.length;
        }
        for (; h2 < a10.length; ) {
          for (b7 = h2, f2 = false; i2(); ) if ("," === (c2 = a10.charAt(h2))) {
            for (d2 = h2, h2 += 1, i2(), e2 = h2; h2 < a10.length && "=" !== (c2 = a10.charAt(h2)) && ";" !== c2 && "," !== c2; ) h2 += 1;
            h2 < a10.length && "=" === a10.charAt(h2) ? (f2 = true, h2 = e2, g2.push(a10.substring(b7, d2)), b7 = h2) : h2 = d2 + 1;
          } else h2 += 1;
          (!f2 || h2 >= a10.length) && g2.push(a10.substring(b7, a10.length));
        }
        return g2;
      }
      function G(a10) {
        let b7 = {}, c2 = [];
        if (a10) for (let [d2, e2] of a10.entries()) "set-cookie" === d2.toLowerCase() ? (c2.push(...F(e2)), b7[d2] = 1 === c2.length ? c2[0] : c2) : b7[d2] = e2;
        return b7;
      }
      function H(a10) {
        try {
          return String(new URL(String(a10)));
        } catch (b7) {
          throw Object.defineProperty(Error(`URL is malformed "${String(a10)}". Please use only absolute URLs - https://nextjs.org/docs/messages/middleware-relative-urls`, { cause: b7 }), "__NEXT_ERROR_CODE", { value: "E61", enumerable: false, configurable: true });
        }
      }
      ({ ...E, GROUP: { builtinReact: [E.reactServerComponents, E.actionBrowser], serverOnly: [E.reactServerComponents, E.actionBrowser, E.instrument, E.middleware], neutralTarget: [E.apiNode, E.apiEdge], clientOnly: [E.serverSideRendering, E.appPagesBrowser], bundled: [E.reactServerComponents, E.actionBrowser, E.serverSideRendering, E.appPagesBrowser, E.shared, E.instrument, E.middleware], appPages: [E.reactServerComponents, E.serverSideRendering, E.appPagesBrowser, E.actionBrowser] } });
      let I = Symbol("response"), J = Symbol("passThrough"), K = Symbol("waitUntil");
      class L {
        constructor(a10, b7) {
          this[J] = false, this[K] = b7 ? { kind: "external", function: b7 } : { kind: "internal", promises: [] };
        }
        respondWith(a10) {
          this[I] || (this[I] = Promise.resolve(a10));
        }
        passThroughOnException() {
          this[J] = true;
        }
        waitUntil(a10) {
          if ("external" === this[K].kind) return (0, this[K].function)(a10);
          this[K].promises.push(a10);
        }
      }
      class M extends L {
        constructor(a10) {
          var b7;
          super(a10.request, null == (b7 = a10.context) ? void 0 : b7.waitUntil), this.sourcePage = a10.page;
        }
        get request() {
          throw Object.defineProperty(new A({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        respondWith() {
          throw Object.defineProperty(new A({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
      }
      function N(a10) {
        return a10.replace(/\/$/, "") || "/";
      }
      function O(a10) {
        let b7 = a10.indexOf("#"), c2 = a10.indexOf("?"), d2 = c2 > -1 && (b7 < 0 || c2 < b7);
        return d2 || b7 > -1 ? { pathname: a10.substring(0, d2 ? c2 : b7), query: d2 ? a10.substring(c2, b7 > -1 ? b7 : void 0) : "", hash: b7 > -1 ? a10.slice(b7) : "" } : { pathname: a10, query: "", hash: "" };
      }
      function P(a10, b7) {
        if (!a10.startsWith("/") || !b7) return a10;
        let { pathname: c2, query: d2, hash: e2 } = O(a10);
        return `${b7}${c2}${d2}${e2}`;
      }
      function Q(a10, b7) {
        if (!a10.startsWith("/") || !b7) return a10;
        let { pathname: c2, query: d2, hash: e2 } = O(a10);
        return `${c2}${b7}${d2}${e2}`;
      }
      function R(a10, b7) {
        if ("string" != typeof a10) return false;
        let { pathname: c2 } = O(a10);
        return c2 === b7 || c2.startsWith(b7 + "/");
      }
      let S = /* @__PURE__ */ new WeakMap();
      function T(a10, b7) {
        let c2;
        if (!b7) return { pathname: a10 };
        let d2 = S.get(b7);
        d2 || (d2 = b7.map((a11) => a11.toLowerCase()), S.set(b7, d2));
        let e2 = a10.split("/", 2);
        if (!e2[1]) return { pathname: a10 };
        let f2 = e2[1].toLowerCase(), g2 = d2.indexOf(f2);
        return g2 < 0 ? { pathname: a10 } : (c2 = b7[g2], { pathname: a10 = a10.slice(c2.length + 1) || "/", detectedLocale: c2 });
      }
      let U = /(?!^https?:\/\/)(127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}|\[::1\]|localhost)/;
      function V(a10, b7) {
        return new URL(String(a10).replace(U, "localhost"), b7 && String(b7).replace(U, "localhost"));
      }
      let W = Symbol("NextURLInternal");
      class X {
        constructor(a10, b7, c2) {
          let d2, e2;
          "object" == typeof b7 && "pathname" in b7 || "string" == typeof b7 ? (d2 = b7, e2 = c2 || {}) : e2 = c2 || b7 || {}, this[W] = { url: V(a10, d2 ?? e2.base), options: e2, basePath: "" }, this.analyze();
        }
        analyze() {
          var a10, b7, c2, d2, e2;
          let f2 = function(a11, b8) {
            let { basePath: c3, i18n: d3, trailingSlash: e3 } = b8.nextConfig ?? {}, f3 = { pathname: a11, trailingSlash: "/" !== a11 ? a11.endsWith("/") : e3 };
            c3 && R(f3.pathname, c3) && (f3.pathname = function(a12, b9) {
              if (!R(a12, b9)) return a12;
              let c4 = a12.slice(b9.length);
              return c4.startsWith("/") ? c4 : `/${c4}`;
            }(f3.pathname, c3), f3.basePath = c3);
            let g3 = f3.pathname;
            if (f3.pathname.startsWith("/_next/data/") && f3.pathname.endsWith(".json")) {
              let a12 = f3.pathname.replace(/^\/_next\/data\//, "").replace(/\.json$/, "").split("/");
              f3.buildId = a12[0], g3 = "index" !== a12[1] ? `/${a12.slice(1).join("/")}` : "/", true === b8.parseData && (f3.pathname = g3);
            }
            if (d3) {
              let a12 = b8.i18nProvider ? b8.i18nProvider.analyze(f3.pathname) : T(f3.pathname, d3.locales);
              f3.locale = a12.detectedLocale, f3.pathname = a12.pathname ?? f3.pathname, !a12.detectedLocale && f3.buildId && (a12 = b8.i18nProvider ? b8.i18nProvider.analyze(g3) : T(g3, d3.locales)).detectedLocale && (f3.locale = a12.detectedLocale);
            }
            return f3;
          }(this[W].url.pathname, { nextConfig: this[W].options.nextConfig, parseData: true, i18nProvider: this[W].options.i18nProvider }), g2 = function(a11, b8) {
            let c3;
            if (b8?.host && !Array.isArray(b8.host)) c3 = b8.host.toString().split(":", 1)[0];
            else {
              if (!a11.hostname) return;
              c3 = a11.hostname;
            }
            return c3.toLowerCase();
          }(this[W].url, this[W].options.headers);
          this[W].domainLocale = this[W].options.i18nProvider ? this[W].options.i18nProvider.detectDomainLocale(g2) : function(a11, b8, c3) {
            if (a11) {
              for (let d3 of (c3 && (c3 = c3.toLowerCase()), a11)) if (b8 === d3.domain?.split(":", 1)[0].toLowerCase() || c3 === d3.defaultLocale.toLowerCase() || d3.locales?.some((a12) => a12.toLowerCase() === c3)) return d3;
            }
          }(null == (b7 = this[W].options.nextConfig) || null == (a10 = b7.i18n) ? void 0 : a10.domains, g2);
          let h2 = (null == (c2 = this[W].domainLocale) ? void 0 : c2.defaultLocale) || (null == (e2 = this[W].options.nextConfig) || null == (d2 = e2.i18n) ? void 0 : d2.defaultLocale);
          this[W].url.pathname = f2.pathname, this[W].defaultLocale = h2, this[W].basePath = f2.basePath ?? "", this[W].buildId = f2.buildId, this[W].locale = f2.locale ?? h2, this[W].trailingSlash = f2.trailingSlash;
        }
        formatPathname() {
          var a10;
          let b7;
          return b7 = function(a11, b8, c2, d2) {
            if (!b8 || b8 === c2) return a11;
            let e2 = a11.toLowerCase();
            return !d2 && (R(e2, "/api") || R(e2, `/${b8.toLowerCase()}`)) ? a11 : P(a11, `/${b8}`);
          }((a10 = { basePath: this[W].basePath, buildId: this[W].buildId, defaultLocale: this[W].options.forceLocale ? void 0 : this[W].defaultLocale, locale: this[W].locale, pathname: this[W].url.pathname, trailingSlash: this[W].trailingSlash }).pathname, a10.locale, a10.buildId ? void 0 : a10.defaultLocale, a10.ignorePrefix), (a10.buildId || !a10.trailingSlash) && (b7 = N(b7)), a10.buildId && (b7 = Q(P(b7, `/_next/data/${a10.buildId}`), "/" === a10.pathname ? "index.json" : ".json")), b7 = P(b7, a10.basePath), !a10.buildId && a10.trailingSlash ? b7.endsWith("/") ? b7 : Q(b7, "/") : N(b7);
        }
        formatSearch() {
          return this[W].url.search;
        }
        get buildId() {
          return this[W].buildId;
        }
        set buildId(a10) {
          this[W].buildId = a10;
        }
        get locale() {
          return this[W].locale ?? "";
        }
        set locale(a10) {
          var b7, c2;
          if (!this[W].locale || !(null == (c2 = this[W].options.nextConfig) || null == (b7 = c2.i18n) ? void 0 : b7.locales.includes(a10))) throw Object.defineProperty(TypeError(`The NextURL configuration includes no locale "${a10}"`), "__NEXT_ERROR_CODE", { value: "E597", enumerable: false, configurable: true });
          this[W].locale = a10;
        }
        get defaultLocale() {
          return this[W].defaultLocale;
        }
        get domainLocale() {
          return this[W].domainLocale;
        }
        get searchParams() {
          return this[W].url.searchParams;
        }
        get host() {
          return this[W].url.host;
        }
        set host(a10) {
          this[W].url.host = a10;
        }
        get hostname() {
          return this[W].url.hostname;
        }
        set hostname(a10) {
          this[W].url.hostname = a10;
        }
        get port() {
          return this[W].url.port;
        }
        set port(a10) {
          this[W].url.port = a10;
        }
        get protocol() {
          return this[W].url.protocol;
        }
        set protocol(a10) {
          this[W].url.protocol = a10;
        }
        get href() {
          let a10 = this.formatPathname(), b7 = this.formatSearch();
          return `${this.protocol}//${this.host}${a10}${b7}${this.hash}`;
        }
        set href(a10) {
          this[W].url = V(a10), this.analyze();
        }
        get origin() {
          return this[W].url.origin;
        }
        get pathname() {
          return this[W].url.pathname;
        }
        set pathname(a10) {
          this[W].url.pathname = a10;
        }
        get hash() {
          return this[W].url.hash;
        }
        set hash(a10) {
          this[W].url.hash = a10;
        }
        get search() {
          return this[W].url.search;
        }
        set search(a10) {
          this[W].url.search = a10;
        }
        get password() {
          return this[W].url.password;
        }
        set password(a10) {
          this[W].url.password = a10;
        }
        get username() {
          return this[W].url.username;
        }
        set username(a10) {
          this[W].url.username = a10;
        }
        get basePath() {
          return this[W].basePath;
        }
        set basePath(a10) {
          this[W].basePath = a10.startsWith("/") ? a10 : `/${a10}`;
        }
        toString() {
          return this.href;
        }
        toJSON() {
          return this.href;
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { href: this.href, origin: this.origin, protocol: this.protocol, username: this.username, password: this.password, host: this.host, hostname: this.hostname, port: this.port, pathname: this.pathname, search: this.search, searchParams: this.searchParams, hash: this.hash };
        }
        clone() {
          return new X(String(this), this[W].options);
        }
      }
      var Y = c(508);
      let Z = Symbol("internal request");
      class $ extends Request {
        constructor(a10, b7 = {}) {
          const c2 = "string" != typeof a10 && "url" in a10 ? a10.url : String(a10);
          H(c2), a10 instanceof Request ? super(a10, b7) : super(c2, b7);
          const d2 = new X(c2, { headers: G(this.headers), nextConfig: b7.nextConfig });
          this[Z] = { cookies: new Y.RequestCookies(this.headers), nextUrl: d2, url: d2.toString() };
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { cookies: this.cookies, nextUrl: this.nextUrl, url: this.url, bodyUsed: this.bodyUsed, cache: this.cache, credentials: this.credentials, destination: this.destination, headers: Object.fromEntries(this.headers), integrity: this.integrity, keepalive: this.keepalive, method: this.method, mode: this.mode, redirect: this.redirect, referrer: this.referrer, referrerPolicy: this.referrerPolicy, signal: this.signal };
        }
        get cookies() {
          return this[Z].cookies;
        }
        get nextUrl() {
          return this[Z].nextUrl;
        }
        get page() {
          throw new B();
        }
        get ua() {
          throw new C();
        }
        get url() {
          return this[Z].url;
        }
      }
      class _ {
        static get(a10, b7, c2) {
          let d2 = Reflect.get(a10, b7, c2);
          return "function" == typeof d2 ? d2.bind(a10) : d2;
        }
        static set(a10, b7, c2, d2) {
          return Reflect.set(a10, b7, c2, d2);
        }
        static has(a10, b7) {
          return Reflect.has(a10, b7);
        }
        static deleteProperty(a10, b7) {
          return Reflect.deleteProperty(a10, b7);
        }
      }
      let aa = Symbol("internal response"), ab = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
      function ac(a10, b7) {
        var c2;
        if (null == a10 || null == (c2 = a10.request) ? void 0 : c2.headers) {
          if (!(a10.request.headers instanceof Headers)) throw Object.defineProperty(Error("request.headers must be an instance of Headers"), "__NEXT_ERROR_CODE", { value: "E119", enumerable: false, configurable: true });
          let c3 = [];
          for (let [d2, e2] of a10.request.headers) b7.set("x-middleware-request-" + d2, e2), c3.push(d2);
          b7.set("x-middleware-override-headers", c3.join(","));
        }
      }
      class ad extends Response {
        constructor(a10, b7 = {}) {
          super(a10, b7);
          const c2 = this.headers, d2 = new Proxy(new Y.ResponseCookies(c2), { get(a11, d3, e2) {
            switch (d3) {
              case "delete":
              case "set":
                return (...e3) => {
                  let f2 = Reflect.apply(a11[d3], a11, e3), g2 = new Headers(c2);
                  return f2 instanceof Y.ResponseCookies && c2.set("x-middleware-set-cookie", f2.getAll().map((a12) => (0, Y.stringifyCookie)(a12)).join(",")), ac(b7, g2), f2;
                };
              default:
                return _.get(a11, d3, e2);
            }
          } });
          this[aa] = { cookies: d2, url: b7.url ? new X(b7.url, { headers: G(c2), nextConfig: b7.nextConfig }) : void 0 };
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { cookies: this.cookies, url: this.url, body: this.body, bodyUsed: this.bodyUsed, headers: Object.fromEntries(this.headers), ok: this.ok, redirected: this.redirected, status: this.status, statusText: this.statusText, type: this.type };
        }
        get cookies() {
          return this[aa].cookies;
        }
        static json(a10, b7) {
          let c2 = Response.json(a10, b7);
          return new ad(c2.body, c2);
        }
        static redirect(a10, b7) {
          let c2 = "number" == typeof b7 ? b7 : (null == b7 ? void 0 : b7.status) ?? 307;
          if (!ab.has(c2)) throw Object.defineProperty(RangeError('Failed to execute "redirect" on "response": Invalid status code'), "__NEXT_ERROR_CODE", { value: "E529", enumerable: false, configurable: true });
          let d2 = "object" == typeof b7 ? b7 : {}, e2 = new Headers(null == d2 ? void 0 : d2.headers);
          return e2.set("Location", H(a10)), new ad(null, { ...d2, headers: e2, status: c2 });
        }
        static rewrite(a10, b7) {
          let c2 = new Headers(null == b7 ? void 0 : b7.headers);
          return c2.set("x-middleware-rewrite", H(a10)), ac(b7, c2), new ad(null, { ...b7, headers: c2 });
        }
        static next(a10) {
          let b7 = new Headers(null == a10 ? void 0 : a10.headers);
          return b7.set("x-middleware-next", "1"), ac(a10, b7), new ad(null, { ...a10, headers: b7 });
        }
      }
      function ae(a10, b7) {
        let c2 = "string" == typeof b7 ? new URL(b7) : b7, d2 = new URL(a10, b7), e2 = d2.origin === c2.origin;
        return { url: e2 ? d2.toString().slice(c2.origin.length) : d2.toString(), isRelative: e2 };
      }
      let af = "next-router-prefetch", ag = ["rsc", "next-router-state-tree", af, "next-hmr-refresh", "next-router-segment-prefetch"], ah = "_rsc";
      class ai extends Error {
        constructor() {
          super("Headers cannot be modified. Read more: https://nextjs.org/docs/app/api-reference/functions/headers");
        }
        static callable() {
          throw new ai();
        }
      }
      class aj extends Headers {
        constructor(a10) {
          super(), this.headers = new Proxy(a10, { get(b7, c2, d2) {
            if ("symbol" == typeof c2) return _.get(b7, c2, d2);
            let e2 = c2.toLowerCase(), f2 = Object.keys(a10).find((a11) => a11.toLowerCase() === e2);
            if (void 0 !== f2) return _.get(b7, f2, d2);
          }, set(b7, c2, d2, e2) {
            if ("symbol" == typeof c2) return _.set(b7, c2, d2, e2);
            let f2 = c2.toLowerCase(), g2 = Object.keys(a10).find((a11) => a11.toLowerCase() === f2);
            return _.set(b7, g2 ?? c2, d2, e2);
          }, has(b7, c2) {
            if ("symbol" == typeof c2) return _.has(b7, c2);
            let d2 = c2.toLowerCase(), e2 = Object.keys(a10).find((a11) => a11.toLowerCase() === d2);
            return void 0 !== e2 && _.has(b7, e2);
          }, deleteProperty(b7, c2) {
            if ("symbol" == typeof c2) return _.deleteProperty(b7, c2);
            let d2 = c2.toLowerCase(), e2 = Object.keys(a10).find((a11) => a11.toLowerCase() === d2);
            return void 0 === e2 || _.deleteProperty(b7, e2);
          } });
        }
        static seal(a10) {
          return new Proxy(a10, { get(a11, b7, c2) {
            switch (b7) {
              case "append":
              case "delete":
              case "set":
                return ai.callable;
              default:
                return _.get(a11, b7, c2);
            }
          } });
        }
        merge(a10) {
          return Array.isArray(a10) ? a10.join(", ") : a10;
        }
        static from(a10) {
          return a10 instanceof Headers ? a10 : new aj(a10);
        }
        append(a10, b7) {
          let c2 = this.headers[a10];
          "string" == typeof c2 ? this.headers[a10] = [c2, b7] : Array.isArray(c2) ? c2.push(b7) : this.headers[a10] = b7;
        }
        delete(a10) {
          delete this.headers[a10];
        }
        get(a10) {
          let b7 = this.headers[a10];
          return void 0 !== b7 ? this.merge(b7) : null;
        }
        has(a10) {
          return void 0 !== this.headers[a10];
        }
        set(a10, b7) {
          this.headers[a10] = b7;
        }
        forEach(a10, b7) {
          for (let [c2, d2] of this.entries()) a10.call(b7, d2, c2, this);
        }
        *entries() {
          for (let a10 of Object.keys(this.headers)) {
            let b7 = a10.toLowerCase(), c2 = this.get(b7);
            yield [b7, c2];
          }
        }
        *keys() {
          for (let a10 of Object.keys(this.headers)) {
            let b7 = a10.toLowerCase();
            yield b7;
          }
        }
        *values() {
          for (let a10 of Object.keys(this.headers)) {
            let b7 = this.get(a10);
            yield b7;
          }
        }
        [Symbol.iterator]() {
          return this.entries();
        }
      }
      let ak = Object.defineProperty(Error("Invariant: AsyncLocalStorage accessed in runtime where it is not available"), "__NEXT_ERROR_CODE", { value: "E504", enumerable: false, configurable: true });
      class al {
        disable() {
          throw ak;
        }
        getStore() {
        }
        run() {
          throw ak;
        }
        exit() {
          throw ak;
        }
        enterWith() {
          throw ak;
        }
        static bind(a10) {
          return a10;
        }
      }
      let am = "u" > typeof globalThis && globalThis.AsyncLocalStorage;
      function an() {
        return am ? new am() : new al();
      }
      let ao = an();
      class ap extends Error {
        constructor() {
          super("Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#options");
        }
        static callable() {
          throw new ap();
        }
      }
      class aq {
        static seal(a10) {
          return new Proxy(a10, { get(a11, b7, c2) {
            switch (b7) {
              case "clear":
              case "delete":
              case "set":
                return ap.callable;
              default:
                return _.get(a11, b7, c2);
            }
          } });
        }
      }
      let ar = Symbol.for("next.mutated.cookies");
      class as {
        static wrap(a10, b7) {
          let c2 = new Y.ResponseCookies(new Headers());
          for (let b8 of a10.getAll()) c2.set(b8);
          let d2 = [], e2 = /* @__PURE__ */ new Set(), f2 = () => {
            let a11 = ao.getStore();
            if (a11 && (a11.pathWasRevalidated = 1), d2 = c2.getAll().filter((a12) => e2.has(a12.name)), b7) {
              let a12 = [];
              for (let b8 of d2) {
                let c3 = new Y.ResponseCookies(new Headers());
                c3.set(b8), a12.push(c3.toString());
              }
              b7(a12);
            }
          }, g2 = new Proxy(c2, { get(a11, b8, c3) {
            switch (b8) {
              case ar:
                return d2;
              case "delete":
                return function(...b9) {
                  e2.add("string" == typeof b9[0] ? b9[0] : b9[0].name);
                  try {
                    return a11.delete(...b9), g2;
                  } finally {
                    f2();
                  }
                };
              case "set":
                return function(...b9) {
                  e2.add("string" == typeof b9[0] ? b9[0] : b9[0].name);
                  try {
                    return a11.set(...b9), g2;
                  } finally {
                    f2();
                  }
                };
              default:
                return _.get(a11, b8, c3);
            }
          } });
          return g2;
        }
      }
      function at(a10, b7) {
        if ("action" !== a10.phase) throw new ap();
      }
      var au = ((g = au || {}).handleRequest = "BaseServer.handleRequest", g.run = "BaseServer.run", g.pipe = "BaseServer.pipe", g.getStaticHTML = "BaseServer.getStaticHTML", g.render = "BaseServer.render", g.renderToResponseWithComponents = "BaseServer.renderToResponseWithComponents", g.renderToResponse = "BaseServer.renderToResponse", g.renderToHTML = "BaseServer.renderToHTML", g.renderError = "BaseServer.renderError", g.renderErrorToResponse = "BaseServer.renderErrorToResponse", g.renderErrorToHTML = "BaseServer.renderErrorToHTML", g.render404 = "BaseServer.render404", g), av = ((h = av || {}).loadDefaultErrorComponents = "LoadComponents.loadDefaultErrorComponents", h.loadComponents = "LoadComponents.loadComponents", h), aw = ((i = aw || {}).getRequestHandler = "NextServer.getRequestHandler", i.getRequestHandlerWithMetadata = "NextServer.getRequestHandlerWithMetadata", i.getServer = "NextServer.getServer", i.getServerRequestHandler = "NextServer.getServerRequestHandler", i.createServer = "createServer.createServer", i), ax = ((j = ax || {}).compression = "NextNodeServer.compression", j.getBuildId = "NextNodeServer.getBuildId", j.createComponentTree = "NextNodeServer.createComponentTree", j.clientComponentLoading = "NextNodeServer.clientComponentLoading", j.getLayoutOrPageModule = "NextNodeServer.getLayoutOrPageModule", j.generateStaticRoutes = "NextNodeServer.generateStaticRoutes", j.generateFsStaticRoutes = "NextNodeServer.generateFsStaticRoutes", j.generatePublicRoutes = "NextNodeServer.generatePublicRoutes", j.generateImageRoutes = "NextNodeServer.generateImageRoutes.route", j.sendRenderResult = "NextNodeServer.sendRenderResult", j.proxyRequest = "NextNodeServer.proxyRequest", j.runApi = "NextNodeServer.runApi", j.render = "NextNodeServer.render", j.renderHTML = "NextNodeServer.renderHTML", j.imageOptimizer = "NextNodeServer.imageOptimizer", j.getPagePath = "NextNodeServer.getPagePath", j.getRoutesManifest = "NextNodeServer.getRoutesManifest", j.findPageComponents = "NextNodeServer.findPageComponents", j.getFontManifest = "NextNodeServer.getFontManifest", j.getServerComponentManifest = "NextNodeServer.getServerComponentManifest", j.getRequestHandler = "NextNodeServer.getRequestHandler", j.renderToHTML = "NextNodeServer.renderToHTML", j.renderError = "NextNodeServer.renderError", j.renderErrorToHTML = "NextNodeServer.renderErrorToHTML", j.render404 = "NextNodeServer.render404", j.startResponse = "NextNodeServer.startResponse", j.route = "route", j.onProxyReq = "onProxyReq", j.apiResolver = "apiResolver", j.internalFetch = "internalFetch", j), ay = ((k = ay || {}).startServer = "startServer.startServer", k), az = ((l = az || {}).getServerSideProps = "Render.getServerSideProps", l.getStaticProps = "Render.getStaticProps", l.renderToString = "Render.renderToString", l.renderDocument = "Render.renderDocument", l.createBodyResult = "Render.createBodyResult", l), aA = ((m = aA || {}).renderToString = "AppRender.renderToString", m.renderToReadableStream = "AppRender.renderToReadableStream", m.getBodyResult = "AppRender.getBodyResult", m.fetch = "AppRender.fetch", m), aB = ((n = aB || {}).executeRoute = "Router.executeRoute", n), aC = ((o = aC || {}).runHandler = "Node.runHandler", o), aD = ((p = aD || {}).runHandler = "AppRouteRouteHandlers.runHandler", p), aE = ((q = aE || {}).generateMetadata = "ResolveMetadata.generateMetadata", q.generateViewport = "ResolveMetadata.generateViewport", q), aF = ((r = aF || {}).execute = "Middleware.execute", r);
      let aG = /* @__PURE__ */ new Set(["Middleware.execute", "BaseServer.handleRequest", "Render.getServerSideProps", "Render.getStaticProps", "AppRender.fetch", "AppRender.getBodyResult", "Render.renderDocument", "Node.runHandler", "AppRouteRouteHandlers.runHandler", "ResolveMetadata.generateMetadata", "ResolveMetadata.generateViewport", "NextNodeServer.createComponentTree", "NextNodeServer.findPageComponents", "NextNodeServer.getLayoutOrPageModule", "NextNodeServer.startResponse", "NextNodeServer.clientComponentLoading"]), aH = /* @__PURE__ */ new Set(["NextNodeServer.findPageComponents", "NextNodeServer.createComponentTree", "NextNodeServer.clientComponentLoading"]);
      function aI(a10) {
        return null !== a10 && "object" == typeof a10 && "then" in a10 && "function" == typeof a10.then;
      }
      let aJ = process.env.NEXT_OTEL_PERFORMANCE_PREFIX, { context: aK, propagation: aL, trace: aM, SpanStatusCode: aN, SpanKind: aO, ROOT_CONTEXT: aP } = d = c(76);
      class aQ extends Error {
        constructor(a10, b7) {
          super(), this.bubble = a10, this.result = b7;
        }
      }
      let aR = (a10, b7) => {
        "object" == typeof b7 && null !== b7 && b7 instanceof aQ && b7.bubble ? a10.setAttribute("next.bubble", true) : (b7 && (a10.recordException(b7), a10.setAttribute("error.type", b7.name)), a10.setStatus({ code: aN.ERROR, message: null == b7 ? void 0 : b7.message })), a10.end();
      }, aS = /* @__PURE__ */ new Map(), aT = d.createContextKey("next.rootSpanId"), aU = 0, aV = { set(a10, b7, c2) {
        a10.push({ key: b7, value: c2 });
      } };
      class aW {
        getTracerInstance() {
          return aM.getTracer("next.js", "0.0.1");
        }
        getContext() {
          return aK;
        }
        getTracePropagationData() {
          let a10 = aK.active(), b7 = [];
          return aL.inject(a10, b7, aV), b7;
        }
        getActiveScopeSpan() {
          return aM.getSpan(null == aK ? void 0 : aK.active());
        }
        withPropagatedContext(a10, b7, c2) {
          let d2 = aK.active();
          if (aM.getSpanContext(d2)) return b7();
          let e2 = aL.extract(d2, a10, c2);
          return aK.with(e2, b7);
        }
        trace(...a10) {
          let [b7, c2, d2] = a10, { fn: e2, options: f2 } = "function" == typeof c2 ? { fn: c2, options: {} } : { fn: d2, options: { ...c2 } }, g2 = f2.spanName ?? b7;
          if (!aG.has(b7) && "1" !== process.env.NEXT_OTEL_VERBOSE || f2.hideSpan) return e2();
          let h2 = this.getSpanContext((null == f2 ? void 0 : f2.parentSpan) ?? this.getActiveScopeSpan());
          h2 || (h2 = (null == aK ? void 0 : aK.active()) ?? aP);
          let i2 = h2.getValue(aT), j2 = "number" != typeof i2 || !aS.has(i2), k2 = aU++;
          return f2.attributes = { "next.span_name": g2, "next.span_type": b7, ...f2.attributes }, aK.with(h2.setValue(aT, k2), () => this.getTracerInstance().startActiveSpan(g2, f2, (a11) => {
            let c3;
            aJ && b7 && aH.has(b7) && (c3 = "performance" in globalThis && "measure" in performance ? globalThis.performance.now() : void 0);
            let d3 = false, g3 = () => {
              !d3 && (d3 = true, aS.delete(k2), c3 && performance.measure(`${aJ}:next-${(b7.split(".").pop() || "").replace(/[A-Z]/g, (a12) => "-" + a12.toLowerCase())}`, { start: c3, end: performance.now() }));
            };
            if (j2 && aS.set(k2, new Map(Object.entries(f2.attributes ?? {}))), e2.length > 1) try {
              return e2(a11, (b8) => aR(a11, b8));
            } catch (b8) {
              throw aR(a11, b8), b8;
            } finally {
              g3();
            }
            try {
              let b8 = e2(a11);
              if (aI(b8)) return b8.then((b9) => (a11.end(), b9)).catch((b9) => {
                throw aR(a11, b9), b9;
              }).finally(g3);
              return a11.end(), g3(), b8;
            } catch (b8) {
              throw aR(a11, b8), g3(), b8;
            }
          }));
        }
        wrap(...a10) {
          let b7 = this, [c2, d2, e2] = 3 === a10.length ? a10 : [a10[0], {}, a10[1]];
          return aG.has(c2) || "1" === process.env.NEXT_OTEL_VERBOSE ? function() {
            let a11 = d2;
            "function" == typeof a11 && "function" == typeof e2 && (a11 = a11.apply(this, arguments));
            let f2 = arguments.length - 1, g2 = arguments[f2];
            if ("function" != typeof g2) return b7.trace(c2, a11, () => e2.apply(this, arguments));
            {
              let d3 = b7.getContext().bind(aK.active(), g2);
              return b7.trace(c2, a11, (a12, b8) => (arguments[f2] = function(a13) {
                return null == b8 || b8(a13), d3.apply(this, arguments);
              }, e2.apply(this, arguments)));
            }
          } : e2;
        }
        startSpan(...a10) {
          let [b7, c2] = a10, d2 = this.getSpanContext((null == c2 ? void 0 : c2.parentSpan) ?? this.getActiveScopeSpan());
          return this.getTracerInstance().startSpan(b7, c2, d2);
        }
        getSpanContext(a10) {
          return a10 ? aM.setSpan(aK.active(), a10) : void 0;
        }
        getRootSpanAttributes() {
          let a10 = aK.active().getValue(aT);
          return aS.get(a10);
        }
        setRootSpanAttribute(a10, b7) {
          let c2 = aK.active().getValue(aT), d2 = aS.get(c2);
          d2 && !d2.has(a10) && d2.set(a10, b7);
        }
        withSpan(a10, b7) {
          let c2 = aM.setSpan(aK.active(), a10);
          return aK.with(c2, b7);
        }
      }
      let aX = (f = new aW(), () => f), aY = "__prerender_bypass";
      Symbol("__next_preview_data"), Symbol(aY);
      class aZ {
        constructor(a10, b7, c2, d2) {
          var e2;
          const f2 = a10 && function(a11, b8) {
            let c3 = aj.from(a11.headers);
            return { isOnDemandRevalidate: c3.get("x-prerender-revalidate") === b8.previewModeId, revalidateOnlyGenerated: c3.has("x-prerender-revalidate-if-generated") };
          }(b7, a10).isOnDemandRevalidate, g2 = null == (e2 = c2.get(aY)) ? void 0 : e2.value;
          this._isEnabled = !!(!f2 && g2 && a10 && g2 === a10.previewModeId), this._previewModeId = null == a10 ? void 0 : a10.previewModeId, this._mutableCookies = d2;
        }
        get isEnabled() {
          return this._isEnabled;
        }
        enable() {
          if (!this._previewModeId) throw Object.defineProperty(Error("Invariant: previewProps missing previewModeId this should never happen"), "__NEXT_ERROR_CODE", { value: "E93", enumerable: false, configurable: true });
          this._mutableCookies.set({ name: aY, value: this._previewModeId, httpOnly: true, sameSite: "none", secure: true, path: "/" }), this._isEnabled = true;
        }
        disable() {
          this._mutableCookies.set({ name: aY, value: "", httpOnly: true, sameSite: "none", secure: true, path: "/", expires: /* @__PURE__ */ new Date(0) }), this._isEnabled = false;
        }
      }
      function a$(a10, b7) {
        if ("x-middleware-set-cookie" in a10.headers && "string" == typeof a10.headers["x-middleware-set-cookie"]) {
          let c2 = a10.headers["x-middleware-set-cookie"], d2 = new Headers();
          for (let a11 of F(c2)) d2.append("set-cookie", a11);
          for (let a11 of new Y.ResponseCookies(d2).getAll()) b7.set(a11);
        }
      }
      let a_ = an();
      var a0 = c(850), a1 = c.n(a0);
      class a2 extends Error {
        constructor(a10, b7) {
          super(`Invariant: ${a10.endsWith(".") ? a10 : a10 + "."} This is a bug in Next.js.`, b7), this.name = "InvariantError";
        }
      }
      c(356).Buffer, process.env.NEXT_PRIVATE_DEBUG_CACHE, Symbol.for("@next/cache-handlers");
      let a3 = Symbol.for("@next/cache-handlers-map"), a4 = Symbol.for("@next/cache-handlers-set"), a5 = globalThis;
      function a6() {
        if (a5[a3]) return a5[a3].entries();
      }
      async function a7(a10, b7) {
        if (!a10) return b7();
        let c2 = a8(a10);
        try {
          return await b7();
        } finally {
          var d2, e2;
          let b8, f2, g2 = (d2 = c2, e2 = a8(a10), b8 = new Set(d2.pendingRevalidatedTags.map((a11) => {
            let b9 = "object" == typeof a11.profile ? JSON.stringify(a11.profile) : a11.profile || "";
            return `${a11.tag}:${b9}`;
          })), f2 = new Set(d2.pendingRevalidateWrites), { pendingRevalidatedTags: e2.pendingRevalidatedTags.filter((a11) => {
            let c3 = "object" == typeof a11.profile ? JSON.stringify(a11.profile) : a11.profile || "";
            return !b8.has(`${a11.tag}:${c3}`);
          }), pendingRevalidates: Object.fromEntries(Object.entries(e2.pendingRevalidates).filter(([a11]) => !(a11 in d2.pendingRevalidates))), pendingRevalidateWrites: e2.pendingRevalidateWrites.filter((a11) => !f2.has(a11)) });
          await ba(a10, g2);
        }
      }
      function a8(a10) {
        return { pendingRevalidatedTags: a10.pendingRevalidatedTags ? [...a10.pendingRevalidatedTags] : [], pendingRevalidates: { ...a10.pendingRevalidates }, pendingRevalidateWrites: a10.pendingRevalidateWrites ? [...a10.pendingRevalidateWrites] : [] };
      }
      async function a9(a10, b7, c2) {
        if (0 === a10.length) return;
        let d2 = function() {
          if (a5[a4]) return a5[a4].values();
        }(), e2 = [], f2 = /* @__PURE__ */ new Map();
        for (let b8 of a10) {
          let a11, c3 = b8.profile;
          for (let [b9] of f2) if ("string" == typeof b9 && "string" == typeof c3 && b9 === c3 || "object" == typeof b9 && "object" == typeof c3 && JSON.stringify(b9) === JSON.stringify(c3) || b9 === c3) {
            a11 = b9;
            break;
          }
          let d3 = a11 || c3;
          f2.has(d3) || f2.set(d3, []), f2.get(d3).push(b8.tag);
        }
        for (let [a11, h2] of f2) {
          let f3;
          if (a11) {
            let b8;
            if ("object" == typeof a11) b8 = a11;
            else if ("string" == typeof a11) {
              var g2;
              if (!(b8 = null == c2 || null == (g2 = c2.cacheLifeProfiles) ? void 0 : g2[a11])) throw Object.defineProperty(Error(`Invalid profile provided "${a11}" must be configured under cacheLife in next.config or be "max"`), "__NEXT_ERROR_CODE", { value: "E873", enumerable: false, configurable: true });
            }
            b8 && (f3 = { expire: b8.expire });
          }
          for (let b8 of d2 || []) a11 ? e2.push(null == b8.updateTags ? void 0 : b8.updateTags.call(b8, h2, f3)) : e2.push(null == b8.updateTags ? void 0 : b8.updateTags.call(b8, h2));
          b7 && e2.push(b7.revalidateTag(h2, f3));
        }
        await Promise.all(e2);
      }
      async function ba(a10, b7) {
        let c2 = (null == b7 ? void 0 : b7.pendingRevalidatedTags) ?? a10.pendingRevalidatedTags ?? [], d2 = (null == b7 ? void 0 : b7.pendingRevalidates) ?? a10.pendingRevalidates ?? {}, e2 = (null == b7 ? void 0 : b7.pendingRevalidateWrites) ?? a10.pendingRevalidateWrites ?? [];
        return Promise.all([a9(c2, a10.incrementalCache, a10), ...Object.values(d2), ...e2]);
      }
      let bb = Object.defineProperty(Error("Invariant: AsyncLocalStorage accessed in runtime where it is not available"), "__NEXT_ERROR_CODE", { value: "E504", enumerable: false, configurable: true });
      class bc {
        disable() {
          throw bb;
        }
        getStore() {
        }
        run() {
          throw bb;
        }
        exit() {
          throw bb;
        }
        enterWith() {
          throw bb;
        }
        static bind(a10) {
          return a10;
        }
      }
      let bd = "u" > typeof globalThis && globalThis.AsyncLocalStorage, be = bd ? new bd() : new bc();
      class bf {
        constructor({ waitUntil: a10, onClose: b7, onTaskError: c2 }) {
          this.workUnitStores = /* @__PURE__ */ new Set(), this.waitUntil = a10, this.onClose = b7, this.onTaskError = c2, this.callbackQueue = new (a1())(), this.callbackQueue.pause();
        }
        after(a10) {
          if (aI(a10)) this.waitUntil || bg(), this.waitUntil(a10.catch((a11) => this.reportTaskError("promise", a11)));
          else if ("function" == typeof a10) this.addCallback(a10);
          else throw Object.defineProperty(Error("`after()`: Argument must be a promise or a function"), "__NEXT_ERROR_CODE", { value: "E50", enumerable: false, configurable: true });
        }
        addCallback(a10) {
          var b7;
          this.waitUntil || bg();
          let c2 = a_.getStore();
          c2 && this.workUnitStores.add(c2);
          let d2 = be.getStore(), e2 = d2 ? d2.rootTaskSpawnPhase : null == c2 ? void 0 : c2.phase;
          this.runCallbacksOnClosePromise || (this.runCallbacksOnClosePromise = this.runCallbacksOnClose(), this.waitUntil(this.runCallbacksOnClosePromise));
          let f2 = (b7 = async () => {
            try {
              await be.run({ rootTaskSpawnPhase: e2 }, () => a10());
            } catch (a11) {
              this.reportTaskError("function", a11);
            }
          }, bd ? bd.bind(b7) : bc.bind(b7));
          this.callbackQueue.add(f2);
        }
        async runCallbacksOnClose() {
          return await new Promise((a10) => this.onClose(a10)), this.runCallbacks();
        }
        async runCallbacks() {
          if (0 === this.callbackQueue.size) return;
          for (let a11 of this.workUnitStores) a11.phase = "after";
          let a10 = ao.getStore();
          if (!a10) throw Object.defineProperty(new a2("Missing workStore in AfterContext.runCallbacks"), "__NEXT_ERROR_CODE", { value: "E547", enumerable: false, configurable: true });
          return a7(a10, () => (this.callbackQueue.start(), this.callbackQueue.onIdle()));
        }
        reportTaskError(a10, b7) {
          if (console.error("promise" === a10 ? "A promise passed to `after()` rejected:" : "An error occurred in a function passed to `after()`:", b7), this.onTaskError) try {
            null == this.onTaskError || this.onTaskError.call(this, b7);
          } catch (a11) {
            console.error(Object.defineProperty(new a2("`onTaskError` threw while handling an error thrown from an `after` task", { cause: a11 }), "__NEXT_ERROR_CODE", { value: "E569", enumerable: false, configurable: true }));
          }
        }
      }
      function bg() {
        throw Object.defineProperty(Error("`after()` will not work correctly, because `waitUntil` is not available in the current environment."), "__NEXT_ERROR_CODE", { value: "E91", enumerable: false, configurable: true });
      }
      function bh(a10) {
        let b7, c2 = { then: (d2, e2) => (b7 || (b7 = Promise.resolve(a10())), b7.then((a11) => {
          c2.value = a11;
        }).catch(() => {
        }), b7.then(d2, e2)) };
        return c2;
      }
      class bi {
        onClose(a10) {
          if (this.isClosed) throw Object.defineProperty(Error("Cannot subscribe to a closed CloseController"), "__NEXT_ERROR_CODE", { value: "E365", enumerable: false, configurable: true });
          this.target.addEventListener("close", a10), this.listeners++;
        }
        dispatchClose() {
          if (this.isClosed) throw Object.defineProperty(Error("Cannot close a CloseController multiple times"), "__NEXT_ERROR_CODE", { value: "E229", enumerable: false, configurable: true });
          this.listeners > 0 && this.target.dispatchEvent(new Event("close")), this.isClosed = true;
        }
        constructor() {
          this.target = new EventTarget(), this.listeners = 0, this.isClosed = false;
        }
      }
      function bj() {
        return { previewModeId: process.env.__NEXT_PREVIEW_MODE_ID || "", previewModeSigningKey: process.env.__NEXT_PREVIEW_MODE_SIGNING_KEY || "", previewModeEncryptionKey: process.env.__NEXT_PREVIEW_MODE_ENCRYPTION_KEY || "" };
      }
      let bk = Symbol.for("@next/request-context");
      async function bl(a10, b7, c2) {
        let d2 = /* @__PURE__ */ new Set();
        for (let b8 of ((a11) => {
          let b9 = ["/layout"];
          if (a11.startsWith("/")) {
            let c3 = a11.split("/");
            for (let a12 = 1; a12 < c3.length + 1; a12++) {
              let d3 = c3.slice(0, a12).join("/");
              d3 && (d3.endsWith("/page") || d3.endsWith("/route") || (d3 = `${d3}${!d3.endsWith("/") ? "/" : ""}layout`), b9.push(d3));
            }
          }
          return b9;
        })(a10)) b8 = `${D}${b8}`, d2.add(b8);
        if (b7.pathname && (!c2 || 0 === c2.size)) {
          let a11 = `${D}${b7.pathname}`;
          d2.add(a11);
        }
        d2.has(`${D}/`) && d2.add(`${D}/index`), d2.has(`${D}/index`) && d2.add(`${D}/`);
        let e2 = Array.from(d2);
        return { tags: e2, expirationsByCacheKind: function(a11) {
          let b8 = /* @__PURE__ */ new Map(), c3 = a6();
          if (c3) for (let [d3, e3] of c3) "getExpiration" in e3 && b8.set(d3, bh(async () => e3.getExpiration(a11)));
          return b8;
        }(e2) };
      }
      class bm extends $ {
        constructor(a10) {
          super(a10.input, a10.init), this.sourcePage = a10.page;
        }
        get request() {
          throw Object.defineProperty(new A({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        respondWith() {
          throw Object.defineProperty(new A({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        waitUntil() {
          throw Object.defineProperty(new A({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
      }
      let bn = { keys: (a10) => Array.from(a10.keys()), get: (a10, b7) => a10.get(b7) ?? void 0 }, bo = (a10, b7) => aX().withPropagatedContext(a10.headers, b7, bn), bp = false;
      async function bq(a10) {
        var b7, d2, e2, f2;
        let g2, h2, i2, j2, k2;
        !function() {
          if (!bp && (bp = true, "true" === process.env.NEXT_PRIVATE_TEST_PROXY)) {
            let { interceptTestApis: a11, wrapRequestHandler: b8 } = c(233);
            a11(), bo = b8(bo);
          }
        }(), await y();
        let l2 = void 0 !== globalThis.__BUILD_MANIFEST;
        a10.request.url = a10.request.url.replace(/\.rsc($|\?)/, "$1");
        let m2 = a10.bypassNextUrl ? new URL(a10.request.url) : new X(a10.request.url, { headers: a10.request.headers, nextConfig: a10.request.nextConfig });
        for (let a11 of [...m2.searchParams.keys()]) {
          let b8 = m2.searchParams.getAll(a11), c2 = function(a12) {
            for (let b9 of ["nxtP", "nxtI"]) if (a12 !== b9 && a12.startsWith(b9)) return a12.substring(b9.length);
            return null;
          }(a11);
          if (c2) {
            for (let a12 of (m2.searchParams.delete(c2), b8)) m2.searchParams.append(c2, a12);
            m2.searchParams.delete(a11);
          }
        }
        let n2 = process.env.__NEXT_BUILD_ID || "";
        "buildId" in m2 && (n2 = m2.buildId || "", m2.buildId = "");
        let o2 = function(a11) {
          let b8 = new Headers();
          for (let [c2, d3] of Object.entries(a11)) for (let a12 of Array.isArray(d3) ? d3 : [d3]) void 0 !== a12 && ("number" == typeof a12 && (a12 = a12.toString()), b8.append(c2, a12));
          return b8;
        }(a10.request.headers), p2 = o2.has("x-nextjs-data"), q2 = "1" === o2.get("rsc");
        p2 && "/index" === m2.pathname && (m2.pathname = "/");
        let r2 = /* @__PURE__ */ new Map();
        if (!l2) for (let a11 of ag) {
          let b8 = o2.get(a11);
          null !== b8 && (r2.set(a11, b8), o2.delete(a11));
        }
        let s2 = m2.searchParams.get(ah), t2 = new bm({ page: a10.page, input: ((j2 = (i2 = "string" == typeof m2) ? new URL(m2) : m2).searchParams.delete(ah), i2 ? j2.toString() : j2).toString(), init: { body: a10.request.body, headers: o2, method: a10.request.method, nextConfig: a10.request.nextConfig, signal: a10.request.signal } });
        p2 && Object.defineProperty(t2, "__isData", { enumerable: false, value: true }), !globalThis.__incrementalCacheShared && a10.IncrementalCache && (globalThis.__incrementalCache = new a10.IncrementalCache({ CurCacheHandler: a10.incrementalCacheHandler, minimalMode: true, fetchCacheKeyPrefix: "", dev: false, requestHeaders: a10.request.headers, getPrerenderManifest: () => ({ version: -1, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: bj() }) }));
        let u2 = a10.request.waitUntil ?? (null == (b7 = null == (k2 = globalThis[bk]) ? void 0 : k2.get()) ? void 0 : b7.waitUntil), v2 = new M({ request: t2, page: a10.page, context: u2 ? { waitUntil: u2 } : void 0 });
        if ((g2 = await bo(t2, () => {
          if ("/middleware" === a10.page || "/src/middleware" === a10.page || "/proxy" === a10.page || "/src/proxy" === a10.page) {
            let b8 = v2.waitUntil.bind(v2), c2 = new bi();
            return aX().trace(aF.execute, { spanName: `middleware ${t2.method}`, attributes: { "http.target": t2.nextUrl.pathname, "http.method": t2.method } }, async () => {
              try {
                var d3, e3, f3, g3, i3, j3;
                let k3 = bj(), l3 = await bl("/", t2.nextUrl, null), m3 = (i3 = t2.nextUrl, j3 = (a11) => {
                  h2 = a11;
                }, function(a11, b9, c3, d4, e4, f4, g4, h3, i4, j4, k4, l4) {
                  function m4(a12) {
                    c3 && c3.setHeader("Set-Cookie", a12);
                  }
                  let n3 = {};
                  return { type: "request", phase: a11, implicitTags: f4, url: { pathname: d4.pathname, search: d4.search ?? "" }, rootParams: e4, get headers() {
                    return n3.headers || (n3.headers = function(a12) {
                      let b10 = aj.from(a12);
                      for (let a13 of ag) b10.delete(a13);
                      return aj.seal(b10);
                    }(b9.headers)), n3.headers;
                  }, get cookies() {
                    if (!n3.cookies) {
                      let a12 = new Y.RequestCookies(aj.from(b9.headers));
                      a$(b9, a12), n3.cookies = aq.seal(a12);
                    }
                    return n3.cookies;
                  }, set cookies(value) {
                    n3.cookies = value;
                  }, get mutableCookies() {
                    if (!n3.mutableCookies) {
                      var o4, p3;
                      let a12, d5 = (o4 = b9.headers, p3 = g4 || (c3 ? m4 : void 0), a12 = new Y.RequestCookies(aj.from(o4)), as.wrap(a12, p3));
                      a$(b9, d5), n3.mutableCookies = d5;
                    }
                    return n3.mutableCookies;
                  }, get userspaceMutableCookies() {
                    if (!n3.userspaceMutableCookies) {
                      var q3;
                      let a12;
                      q3 = this, n3.userspaceMutableCookies = a12 = new Proxy(q3.mutableCookies, { get(b10, c4, d5) {
                        switch (c4) {
                          case "delete":
                            return function(...c5) {
                              return at(q3, "cookies().delete"), b10.delete(...c5), a12;
                            };
                          case "set":
                            return function(...c5) {
                              return at(q3, "cookies().set"), b10.set(...c5), a12;
                            };
                          default:
                            return _.get(b10, c4, d5);
                        }
                      } });
                    }
                    return n3.userspaceMutableCookies;
                  }, get draftMode() {
                    return n3.draftMode || (n3.draftMode = new aZ(i4, b9, this.cookies, this.mutableCookies)), n3.draftMode;
                  }, renderResumeDataCache: null, isHmrRefresh: j4, serverComponentsHmrCache: k4 || globalThis.__serverComponentsHmrCache, devFallbackParams: null };
                }("action", t2, void 0, i3, {}, l3, j3, null, k3, false, void 0, null)), o3 = function({ page: a11, renderOpts: b9, isPrefetchRequest: c3, buildId: d4, previouslyRevalidatedTags: e4, nonce: f4 }) {
                  var g4;
                  let h3 = !b9.shouldWaitOnAllReady && !b9.supportsDynamicResponse && !b9.isDraftMode && !b9.isPossibleServerAction, i4 = b9.dev ?? false, j4 = i4 || h3 && (!!process.env.NEXT_DEBUG_BUILD || "1" === process.env.NEXT_SSG_FETCH_METRICS), k4 = { isStaticGeneration: h3, page: a11, route: (g4 = a11.split("/").reduce((a12, b10, c4, d5) => b10 ? "(" === b10[0] && b10.endsWith(")") || "@" === b10[0] || ("page" === b10 || "route" === b10) && c4 === d5.length - 1 ? a12 : `${a12}/${b10}` : a12, "")).startsWith("/") ? g4 : `/${g4}`, incrementalCache: b9.incrementalCache || globalThis.__incrementalCache, cacheLifeProfiles: b9.cacheLifeProfiles, isBuildTimePrerendering: b9.nextExport, hasReadableErrorStacks: b9.hasReadableErrorStacks, fetchCache: b9.fetchCache, isOnDemandRevalidate: b9.isOnDemandRevalidate, isDraftMode: b9.isDraftMode, isPrefetchRequest: c3, buildId: d4, reactLoadableManifest: (null == b9 ? void 0 : b9.reactLoadableManifest) || {}, assetPrefix: (null == b9 ? void 0 : b9.assetPrefix) || "", nonce: f4, afterContext: function(a12) {
                    let { waitUntil: b10, onClose: c4, onAfterTaskError: d5 } = a12;
                    return new bf({ waitUntil: b10, onClose: c4, onTaskError: d5 });
                  }(b9), cacheComponentsEnabled: b9.cacheComponents, dev: i4, previouslyRevalidatedTags: e4, refreshTagsByCacheKind: function() {
                    let a12 = /* @__PURE__ */ new Map(), b10 = a6();
                    if (b10) for (let [c4, d5] of b10) "refreshTags" in d5 && a12.set(c4, bh(async () => d5.refreshTags()));
                    return a12;
                  }(), runInCleanSnapshot: bd ? bd.snapshot() : function(a12, ...b10) {
                    return a12(...b10);
                  }, shouldTrackFetchMetrics: j4, reactServerErrorsByDigest: /* @__PURE__ */ new Map() };
                  return b9.store = k4, k4;
                }({ page: "/", renderOpts: { cacheLifeProfiles: null == (e3 = a10.request.nextConfig) || null == (d3 = e3.experimental) ? void 0 : d3.cacheLife, cacheComponents: false, experimental: { isRoutePPREnabled: false, authInterrupts: !!(null == (g3 = a10.request.nextConfig) || null == (f3 = g3.experimental) ? void 0 : f3.authInterrupts) }, supportsDynamicResponse: true, waitUntil: b8, onClose: c2.onClose.bind(c2), onAfterTaskError: void 0 }, isPrefetchRequest: "1" === t2.headers.get(af), buildId: n2 ?? "", previouslyRevalidatedTags: [] });
                return await ao.run(o3, () => a_.run(m3, a10.handler, t2, v2));
              } finally {
                setTimeout(() => {
                  c2.dispatchClose();
                }, 0);
              }
            });
          }
          return a10.handler(t2, v2);
        })) && !(g2 instanceof Response)) throw Object.defineProperty(TypeError("Expected an instance of Response to be returned"), "__NEXT_ERROR_CODE", { value: "E567", enumerable: false, configurable: true });
        g2 && h2 && g2.headers.set("set-cookie", h2);
        let w2 = null == g2 ? void 0 : g2.headers.get("x-middleware-rewrite");
        if (g2 && w2 && (q2 || !l2)) {
          let b8 = new X(w2, { forceLocale: true, headers: a10.request.headers, nextConfig: a10.request.nextConfig });
          l2 || b8.host !== t2.nextUrl.host || (b8.buildId = n2 || b8.buildId, g2.headers.set("x-middleware-rewrite", String(b8)));
          let { url: c2, isRelative: h3 } = ae(b8.toString(), m2.toString());
          !l2 && p2 && g2.headers.set("x-nextjs-rewrite", c2);
          let i3 = !h3 && (null == (f2 = a10.request.nextConfig) || null == (e2 = f2.experimental) || null == (d2 = e2.clientParamParsingOrigins) ? void 0 : d2.some((a11) => new RegExp(a11).test(b8.origin)));
          q2 && (h3 || i3) && (m2.pathname !== b8.pathname && g2.headers.set("x-nextjs-rewritten-path", b8.pathname), m2.search !== b8.search && g2.headers.set("x-nextjs-rewritten-query", b8.search.slice(1)));
        }
        if (g2 && w2 && q2 && s2) {
          let a11 = new URL(w2);
          a11.searchParams.has(ah) || (a11.searchParams.set(ah, s2), g2.headers.set("x-middleware-rewrite", a11.toString()));
        }
        let x2 = null == g2 ? void 0 : g2.headers.get("Location");
        if (g2 && x2 && !l2) {
          let b8 = new X(x2, { forceLocale: false, headers: a10.request.headers, nextConfig: a10.request.nextConfig });
          g2 = new Response(g2.body, g2), b8.host === m2.host && (b8.buildId = n2 || b8.buildId, g2.headers.set("Location", ae(b8, m2).url)), p2 && (g2.headers.delete("Location"), g2.headers.set("x-nextjs-redirect", ae(b8.toString(), m2.toString()).url));
        }
        let z2 = g2 || ad.next(), A2 = z2.headers.get("x-middleware-override-headers"), B2 = [];
        if (A2) {
          for (let [a11, b8] of r2) z2.headers.set(`x-middleware-request-${a11}`, b8), B2.push(a11);
          B2.length > 0 && z2.headers.set("x-middleware-override-headers", A2 + "," + B2.join(","));
        }
        return { response: z2, waitUntil: ("internal" === v2[K].kind ? Promise.all(v2[K].promises).then(() => {
        }) : void 0) ?? Promise.resolve(), fetchMetrics: t2.fetchMetrics };
      }
      c(808), "u" < typeof URLPattern || URLPattern;
      var br = c(879);
      if (/* @__PURE__ */ new WeakMap(), br.unstable_postpone, false === ("Route %%% needs to bail out of prerendering at this point because it used ^^^. React throws this special object to indicate where. It should not be caught by your own try/catch. Learn more: https://nextjs.org/docs/messages/ppr-caught-error".includes("needs to bail out of prerendering at this point because it used") && "Route %%% needs to bail out of prerendering at this point because it used ^^^. React throws this special object to indicate where. It should not be caught by your own try/catch. Learn more: https://nextjs.org/docs/messages/ppr-caught-error".includes("Learn more: https://nextjs.org/docs/messages/ppr-caught-error"))) throw Object.defineProperty(Error("Invariant: isDynamicPostpone misidentified a postpone reason. This is a bug in Next.js"), "__NEXT_ERROR_CODE", { value: "E296", enumerable: false, configurable: true });
      RegExp(`\\n\\s+at Suspense \\(<anonymous>\\)(?:(?!\\n\\s+at (?:body|div|main|section|article|aside|header|footer|nav|form|p|span|h1|h2|h3|h4|h5|h6) \\(<anonymous>\\))[\\s\\S])*?\\n\\s+at __next_root_layout_boundary__ \\([^\\n]*\\)`), RegExp(`\\n\\s+at __next_metadata_boundary__[\\n\\s]`), RegExp(`\\n\\s+at __next_viewport_boundary__[\\n\\s]`), RegExp(`\\n\\s+at __next_outlet_boundary__[\\n\\s]`);
      let bs = new TextEncoder(), bt = new TextDecoder();
      function bu(a10) {
        let b7 = new Uint8Array(a10.length);
        for (let c2 = 0; c2 < a10.length; c2++) {
          let d2 = a10.charCodeAt(c2);
          if (d2 > 127) throw TypeError("non-ASCII string encountered in encode()");
          b7[c2] = d2;
        }
        return b7;
      }
      function bv(a10) {
        if (Uint8Array.fromBase64) return Uint8Array.fromBase64("string" == typeof a10 ? a10 : bt.decode(a10), { alphabet: "base64url" });
        let b7 = a10;
        b7 instanceof Uint8Array && (b7 = bt.decode(b7)), b7 = b7.replace(/-/g, "+").replace(/_/g, "/");
        try {
          var c2 = b7;
          if (Uint8Array.fromBase64) return Uint8Array.fromBase64(c2);
          let a11 = atob(c2), d2 = new Uint8Array(a11.length);
          for (let b8 = 0; b8 < a11.length; b8++) d2[b8] = a11.charCodeAt(b8);
          return d2;
        } catch {
          throw TypeError("The input to be decoded is not correctly encoded.");
        }
      }
      class bw extends Error {
        static code = "ERR_JOSE_GENERIC";
        code = "ERR_JOSE_GENERIC";
        constructor(a10, b7) {
          super(a10, b7), this.name = this.constructor.name, Error.captureStackTrace?.(this, this.constructor);
        }
      }
      class bx extends bw {
        static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
        code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
        claim;
        reason;
        payload;
        constructor(a10, b7, c2 = "unspecified", d2 = "unspecified") {
          super(a10, { cause: { claim: c2, reason: d2, payload: b7 } }), this.claim = c2, this.reason = d2, this.payload = b7;
        }
      }
      class by extends bw {
        static code = "ERR_JWT_EXPIRED";
        code = "ERR_JWT_EXPIRED";
        claim;
        reason;
        payload;
        constructor(a10, b7, c2 = "unspecified", d2 = "unspecified") {
          super(a10, { cause: { claim: c2, reason: d2, payload: b7 } }), this.claim = c2, this.reason = d2, this.payload = b7;
        }
      }
      class bz extends bw {
        static code = "ERR_JOSE_ALG_NOT_ALLOWED";
        code = "ERR_JOSE_ALG_NOT_ALLOWED";
      }
      class bA extends bw {
        static code = "ERR_JOSE_NOT_SUPPORTED";
        code = "ERR_JOSE_NOT_SUPPORTED";
      }
      class bB extends bw {
        static code = "ERR_JWS_INVALID";
        code = "ERR_JWS_INVALID";
      }
      class bC extends bw {
        static code = "ERR_JWT_INVALID";
        code = "ERR_JWT_INVALID";
      }
      class bD extends bw {
        [Symbol.asyncIterator];
        static code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
        code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
        constructor(a10 = "multiple matching keys found in the JSON Web Key Set", b7) {
          super(a10, b7);
        }
      }
      class bE extends bw {
        static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
        code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
        constructor(a10 = "signature verification failed", b7) {
          super(a10, b7);
        }
      }
      let bF = (a10, b7 = "algorithm.name") => TypeError(`CryptoKey does not support this operation, its ${b7} must be ${a10}`);
      function bG(a10) {
        return parseInt(a10.name.slice(4), 10);
      }
      function bH(a10, b7, ...c2) {
        if ((c2 = c2.filter(Boolean)).length > 2) {
          let b8 = c2.pop();
          a10 += `one of type ${c2.join(", ")}, or ${b8}.`;
        } else 2 === c2.length ? a10 += `one of type ${c2[0]} or ${c2[1]}.` : a10 += `of type ${c2[0]}.`;
        return null == b7 ? a10 += ` Received ${b7}` : "function" == typeof b7 && b7.name ? a10 += ` Received function ${b7.name}` : "object" == typeof b7 && null != b7 && b7.constructor?.name && (a10 += ` Received an instance of ${b7.constructor.name}`), a10;
      }
      let bI = (a10, b7, ...c2) => bH(`Key for the ${a10} algorithm must be `, b7, ...c2);
      async function bJ(a10, b7, c2) {
        if (b7 instanceof Uint8Array) {
          if (!a10.startsWith("HS")) throw TypeError(((a11, ...b8) => bH("Key must be ", a11, ...b8))(b7, "CryptoKey", "KeyObject", "JSON Web Key"));
          return crypto.subtle.importKey("raw", b7, { hash: `SHA-${a10.slice(-3)}`, name: "HMAC" }, false, [c2]);
        }
        return !function(a11, b8, c3) {
          switch (b8) {
            case "HS256":
            case "HS384":
            case "HS512": {
              if ("HMAC" !== a11.algorithm.name) throw bF("HMAC");
              let c4 = parseInt(b8.slice(2), 10);
              if (bG(a11.algorithm.hash) !== c4) throw bF(`SHA-${c4}`, "algorithm.hash");
              break;
            }
            case "RS256":
            case "RS384":
            case "RS512": {
              if ("RSASSA-PKCS1-v1_5" !== a11.algorithm.name) throw bF("RSASSA-PKCS1-v1_5");
              let c4 = parseInt(b8.slice(2), 10);
              if (bG(a11.algorithm.hash) !== c4) throw bF(`SHA-${c4}`, "algorithm.hash");
              break;
            }
            case "PS256":
            case "PS384":
            case "PS512": {
              if ("RSA-PSS" !== a11.algorithm.name) throw bF("RSA-PSS");
              let c4 = parseInt(b8.slice(2), 10);
              if (bG(a11.algorithm.hash) !== c4) throw bF(`SHA-${c4}`, "algorithm.hash");
              break;
            }
            case "Ed25519":
            case "EdDSA":
              if ("Ed25519" !== a11.algorithm.name) throw bF("Ed25519");
              break;
            case "ML-DSA-44":
            case "ML-DSA-65":
            case "ML-DSA-87":
              let d2;
              if (d2 = a11.algorithm, d2.name !== b8) throw bF(b8);
              break;
            case "ES256":
            case "ES384":
            case "ES512": {
              if ("ECDSA" !== a11.algorithm.name) throw bF("ECDSA");
              let c4 = function(a12) {
                switch (a12) {
                  case "ES256":
                    return "P-256";
                  case "ES384":
                    return "P-384";
                  case "ES512":
                    return "P-521";
                  default:
                    throw Error("unreachable");
                }
              }(b8);
              if (a11.algorithm.namedCurve !== c4) throw bF(c4, "algorithm.namedCurve");
              break;
            }
            default:
              throw TypeError("CryptoKey does not support this operation");
          }
          if (c3 && !a11.usages.includes(c3)) throw TypeError(`CryptoKey does not support this operation, its usages must include ${c3}.`);
        }(b7, a10, c2), b7;
      }
      async function bK(a10, b7, c2, d2) {
        let e2 = await bJ(a10, b7, "verify");
        !function(a11, b8) {
          if (a11.startsWith("RS") || a11.startsWith("PS")) {
            let { modulusLength: c3 } = b8.algorithm;
            if ("number" != typeof c3 || c3 < 2048) throw TypeError(`${a11} requires key modulusLength to be 2048 bits or larger`);
          }
        }(a10, e2);
        let f2 = function(a11, b8) {
          let c3 = `SHA-${a11.slice(-3)}`;
          switch (a11) {
            case "HS256":
            case "HS384":
            case "HS512":
              return { hash: c3, name: "HMAC" };
            case "PS256":
            case "PS384":
            case "PS512":
              return { hash: c3, name: "RSA-PSS", saltLength: parseInt(a11.slice(-3), 10) >> 3 };
            case "RS256":
            case "RS384":
            case "RS512":
              return { hash: c3, name: "RSASSA-PKCS1-v1_5" };
            case "ES256":
            case "ES384":
            case "ES512":
              return { hash: c3, name: "ECDSA", namedCurve: b8.namedCurve };
            case "Ed25519":
            case "EdDSA":
              return { name: "Ed25519" };
            case "ML-DSA-44":
            case "ML-DSA-65":
            case "ML-DSA-87":
              return { name: a11 };
            default:
              throw new bA(`alg ${a11} is not supported either by JOSE or your javascript runtime`);
          }
        }(a10, e2.algorithm);
        try {
          return await crypto.subtle.verify(f2, e2, c2, d2);
        } catch {
          return false;
        }
      }
      function bL(a10) {
        if ("object" != typeof a10 || null === a10 || "[object Object]" !== Object.prototype.toString.call(a10)) return false;
        if (null === Object.getPrototypeOf(a10)) return true;
        let b7 = a10;
        for (; null !== Object.getPrototypeOf(b7); ) b7 = Object.getPrototypeOf(b7);
        return Object.getPrototypeOf(a10) === b7;
      }
      let bM = (a10) => {
        if (a10?.[Symbol.toStringTag] === "CryptoKey") return true;
        try {
          return a10 instanceof CryptoKey;
        } catch {
          return false;
        }
      }, bN = (a10) => a10?.[Symbol.toStringTag] === "KeyObject", bO = (a10) => bM(a10) || bN(a10), bP = (a10) => bL(a10) && "string" == typeof a10.kty, bQ = (a10) => a10?.[Symbol.toStringTag], bR = (a10, b7, c2) => {
        if (void 0 !== b7.use) {
          let a11;
          switch (c2) {
            case "sign":
            case "verify":
              a11 = "sig";
              break;
            case "encrypt":
            case "decrypt":
              a11 = "enc";
          }
          if (b7.use !== a11) throw TypeError(`Invalid key for this operation, its "use" must be "${a11}" when present`);
        }
        if (void 0 !== b7.alg && b7.alg !== a10) throw TypeError(`Invalid key for this operation, its "alg" must be "${a10}" when present`);
        if (Array.isArray(b7.key_ops)) {
          let d2;
          switch (true) {
            case ("sign" === c2 || "verify" === c2):
            case "dir" === a10:
            case a10.includes("CBC-HS"):
              d2 = c2;
              break;
            case a10.startsWith("PBES2"):
              d2 = "deriveBits";
              break;
            case /^A\d{3}(?:GCM)?(?:KW)?$/.test(a10):
              d2 = !a10.includes("GCM") && a10.endsWith("KW") ? "encrypt" === c2 ? "wrapKey" : "unwrapKey" : c2;
              break;
            case ("encrypt" === c2 && a10.startsWith("RSA")):
              d2 = "wrapKey";
              break;
            case "decrypt" === c2:
              d2 = a10.startsWith("RSA") ? "unwrapKey" : "deriveBits";
          }
          if (d2 && b7.key_ops?.includes?.(d2) === false) throw TypeError(`Invalid key for this operation, its "key_ops" must include "${d2}" when present`);
        }
        return true;
      };
      async function bS(a10) {
        if (!a10.alg) throw TypeError('"alg" argument is required when "jwk.alg" is not present');
        let { algorithm: b7, keyUsages: c2 } = function(a11) {
          let b8, c3;
          switch (a11.kty) {
            case "AKP":
              switch (a11.alg) {
                case "ML-DSA-44":
                case "ML-DSA-65":
                case "ML-DSA-87":
                  b8 = { name: a11.alg }, c3 = a11.priv ? ["sign"] : ["verify"];
                  break;
                default:
                  throw new bA('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
              }
              break;
            case "RSA":
              switch (a11.alg) {
                case "PS256":
                case "PS384":
                case "PS512":
                  b8 = { name: "RSA-PSS", hash: `SHA-${a11.alg.slice(-3)}` }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "RS256":
                case "RS384":
                case "RS512":
                  b8 = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${a11.alg.slice(-3)}` }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "RSA-OAEP":
                case "RSA-OAEP-256":
                case "RSA-OAEP-384":
                case "RSA-OAEP-512":
                  b8 = { name: "RSA-OAEP", hash: `SHA-${parseInt(a11.alg.slice(-3), 10) || 1}` }, c3 = a11.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"];
                  break;
                default:
                  throw new bA('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
              }
              break;
            case "EC":
              switch (a11.alg) {
                case "ES256":
                  b8 = { name: "ECDSA", namedCurve: "P-256" }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "ES384":
                  b8 = { name: "ECDSA", namedCurve: "P-384" }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "ES512":
                  b8 = { name: "ECDSA", namedCurve: "P-521" }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "ECDH-ES":
                case "ECDH-ES+A128KW":
                case "ECDH-ES+A192KW":
                case "ECDH-ES+A256KW":
                  b8 = { name: "ECDH", namedCurve: a11.crv }, c3 = a11.d ? ["deriveBits"] : [];
                  break;
                default:
                  throw new bA('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
              }
              break;
            case "OKP":
              switch (a11.alg) {
                case "Ed25519":
                case "EdDSA":
                  b8 = { name: "Ed25519" }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "ECDH-ES":
                case "ECDH-ES+A128KW":
                case "ECDH-ES+A192KW":
                case "ECDH-ES+A256KW":
                  b8 = { name: a11.crv }, c3 = a11.d ? ["deriveBits"] : [];
                  break;
                default:
                  throw new bA('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
              }
              break;
            default:
              throw new bA('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
          }
          return { algorithm: b8, keyUsages: c3 };
        }(a10), d2 = { ...a10 };
        return "AKP" !== d2.kty && delete d2.alg, delete d2.use, crypto.subtle.importKey("jwk", d2, b7, a10.ext ?? (!a10.d && !a10.priv), a10.key_ops ?? c2);
      }
      let bT = async (a10, b7, c2, d2 = false) => {
        let f2 = (e ||= /* @__PURE__ */ new WeakMap()).get(a10);
        if (f2?.[c2]) return f2[c2];
        let g2 = await bS({ ...b7, alg: c2 });
        return d2 && Object.freeze(a10), f2 ? f2[c2] = g2 : e.set(a10, { [c2]: g2 }), g2;
      };
      async function bU(a10, b7) {
        if (a10 instanceof Uint8Array || bM(a10)) return a10;
        if (bN(a10)) {
          if ("secret" === a10.type) return a10.export();
          if ("toCryptoKey" in a10 && "function" == typeof a10.toCryptoKey) try {
            return ((a11, b8) => {
              let c3, d2 = (e ||= /* @__PURE__ */ new WeakMap()).get(a11);
              if (d2?.[b8]) return d2[b8];
              let f2 = "public" === a11.type, g2 = !!f2;
              if ("x25519" === a11.asymmetricKeyType) {
                switch (b8) {
                  case "ECDH-ES":
                  case "ECDH-ES+A128KW":
                  case "ECDH-ES+A192KW":
                  case "ECDH-ES+A256KW":
                    break;
                  default:
                    throw TypeError("given KeyObject instance cannot be used for this algorithm");
                }
                c3 = a11.toCryptoKey(a11.asymmetricKeyType, g2, f2 ? [] : ["deriveBits"]);
              }
              if ("ed25519" === a11.asymmetricKeyType) {
                if ("EdDSA" !== b8 && "Ed25519" !== b8) throw TypeError("given KeyObject instance cannot be used for this algorithm");
                c3 = a11.toCryptoKey(a11.asymmetricKeyType, g2, [f2 ? "verify" : "sign"]);
              }
              switch (a11.asymmetricKeyType) {
                case "ml-dsa-44":
                case "ml-dsa-65":
                case "ml-dsa-87":
                  if (b8 !== a11.asymmetricKeyType.toUpperCase()) throw TypeError("given KeyObject instance cannot be used for this algorithm");
                  c3 = a11.toCryptoKey(a11.asymmetricKeyType, g2, [f2 ? "verify" : "sign"]);
              }
              if ("rsa" === a11.asymmetricKeyType) {
                let d3;
                switch (b8) {
                  case "RSA-OAEP":
                    d3 = "SHA-1";
                    break;
                  case "RS256":
                  case "PS256":
                  case "RSA-OAEP-256":
                    d3 = "SHA-256";
                    break;
                  case "RS384":
                  case "PS384":
                  case "RSA-OAEP-384":
                    d3 = "SHA-384";
                    break;
                  case "RS512":
                  case "PS512":
                  case "RSA-OAEP-512":
                    d3 = "SHA-512";
                    break;
                  default:
                    throw TypeError("given KeyObject instance cannot be used for this algorithm");
                }
                if (b8.startsWith("RSA-OAEP")) return a11.toCryptoKey({ name: "RSA-OAEP", hash: d3 }, g2, f2 ? ["encrypt"] : ["decrypt"]);
                c3 = a11.toCryptoKey({ name: b8.startsWith("PS") ? "RSA-PSS" : "RSASSA-PKCS1-v1_5", hash: d3 }, g2, [f2 ? "verify" : "sign"]);
              }
              if ("ec" === a11.asymmetricKeyType) {
                let d3 = (/* @__PURE__ */ new Map([["prime256v1", "P-256"], ["secp384r1", "P-384"], ["secp521r1", "P-521"]])).get(a11.asymmetricKeyDetails?.namedCurve);
                if (!d3) throw TypeError("given KeyObject instance cannot be used for this algorithm");
                "ES256" === b8 && "P-256" === d3 && (c3 = a11.toCryptoKey({ name: "ECDSA", namedCurve: d3 }, g2, [f2 ? "verify" : "sign"])), "ES384" === b8 && "P-384" === d3 && (c3 = a11.toCryptoKey({ name: "ECDSA", namedCurve: d3 }, g2, [f2 ? "verify" : "sign"])), "ES512" === b8 && "P-521" === d3 && (c3 = a11.toCryptoKey({ name: "ECDSA", namedCurve: d3 }, g2, [f2 ? "verify" : "sign"])), b8.startsWith("ECDH-ES") && (c3 = a11.toCryptoKey({ name: "ECDH", namedCurve: d3 }, g2, f2 ? [] : ["deriveBits"]));
              }
              if (!c3) throw TypeError("given KeyObject instance cannot be used for this algorithm");
              return d2 ? d2[b8] = c3 : e.set(a11, { [b8]: c3 }), c3;
            })(a10, b7);
          } catch (a11) {
            if (a11 instanceof TypeError) throw a11;
          }
          let c2 = a10.export({ format: "jwk" });
          return bT(a10, c2, b7);
        }
        if (bP(a10)) return a10.k ? bv(a10.k) : bT(a10, a10, b7, true);
        throw Error("unreachable");
      }
      async function bV(a10, b7, c2) {
        let d2, e2;
        if (!bL(a10)) throw new bB("Flattened JWS must be an object");
        if (void 0 === a10.protected && void 0 === a10.header) throw new bB('Flattened JWS must have either of the "protected" or "header" members');
        if (void 0 !== a10.protected && "string" != typeof a10.protected) throw new bB("JWS Protected Header incorrect type");
        if (void 0 === a10.payload) throw new bB("JWS Payload missing");
        if ("string" != typeof a10.signature) throw new bB("JWS Signature missing or incorrect type");
        if (void 0 !== a10.header && !bL(a10.header)) throw new bB("JWS Unprotected Header incorrect type");
        let f2 = {};
        if (a10.protected) try {
          let b8 = bv(a10.protected);
          f2 = JSON.parse(bt.decode(b8));
        } catch {
          throw new bB("JWS Protected Header is invalid");
        }
        if (!function(...a11) {
          let b8, c3 = a11.filter(Boolean);
          if (0 === c3.length || 1 === c3.length) return true;
          for (let a12 of c3) {
            let c4 = Object.keys(a12);
            if (!b8 || 0 === b8.size) {
              b8 = new Set(c4);
              continue;
            }
            for (let a13 of c4) {
              if (b8.has(a13)) return false;
              b8.add(a13);
            }
          }
          return true;
        }(f2, a10.header)) throw new bB("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
        let g2 = { ...f2, ...a10.header }, h2 = function(a11, b8, c3, d3, e3) {
          let f3;
          if (void 0 !== e3.crit && d3?.crit === void 0) throw new a11('"crit" (Critical) Header Parameter MUST be integrity protected');
          if (!d3 || void 0 === d3.crit) return /* @__PURE__ */ new Set();
          if (!Array.isArray(d3.crit) || 0 === d3.crit.length || d3.crit.some((a12) => "string" != typeof a12 || 0 === a12.length)) throw new a11('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
          for (let g3 of (f3 = void 0 !== c3 ? new Map([...Object.entries(c3), ...b8.entries()]) : b8, d3.crit)) {
            if (!f3.has(g3)) throw new bA(`Extension Header Parameter "${g3}" is not recognized`);
            if (void 0 === e3[g3]) throw new a11(`Extension Header Parameter "${g3}" is missing`);
            if (f3.get(g3) && void 0 === d3[g3]) throw new a11(`Extension Header Parameter "${g3}" MUST be integrity protected`);
          }
          return new Set(d3.crit);
        }(bB, /* @__PURE__ */ new Map([["b64", true]]), c2?.crit, f2, g2), i2 = true;
        if (h2.has("b64") && "boolean" != typeof (i2 = f2.b64)) throw new bB('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
        let { alg: j2 } = g2;
        if ("string" != typeof j2 || !j2) throw new bB('JWS "alg" (Algorithm) Header Parameter missing or invalid');
        let k2 = c2 && function(a11, b8) {
          if (void 0 !== b8 && (!Array.isArray(b8) || b8.some((a12) => "string" != typeof a12))) throw TypeError(`"${a11}" option must be an array of strings`);
          if (b8) return new Set(b8);
        }("algorithms", c2.algorithms);
        if (k2 && !k2.has(j2)) throw new bz('"alg" (Algorithm) Header Parameter value not allowed');
        if (i2) {
          if ("string" != typeof a10.payload) throw new bB("JWS Payload must be a string");
        } else if ("string" != typeof a10.payload && !(a10.payload instanceof Uint8Array)) throw new bB("JWS Payload must be a string or an Uint8Array instance");
        let l2 = false;
        "function" == typeof b7 && (b7 = await b7(f2, a10), l2 = true);
        var m2 = b7, n2 = "verify";
        switch (j2.substring(0, 2)) {
          case "A1":
          case "A2":
          case "di":
          case "HS":
          case "PB":
            ((a11, b8, c3) => {
              if (!(b8 instanceof Uint8Array)) {
                if (bP(b8)) {
                  if ("oct" === b8.kty && "string" == typeof b8.k && bR(a11, b8, c3)) return;
                  throw TypeError('JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present');
                }
                if (!bO(b8)) throw TypeError(bI(a11, b8, "CryptoKey", "KeyObject", "JSON Web Key", "Uint8Array"));
                if ("secret" !== b8.type) throw TypeError(`${bQ(b8)} instances for symmetric algorithms must be of type "secret"`);
              }
            })(j2, m2, n2);
            break;
          default:
            ((a11, b8, c3) => {
              if (bP(b8)) switch (c3) {
                case "decrypt":
                case "sign":
                  if ("oct" !== b8.kty && ("AKP" === b8.kty && "string" == typeof b8.priv || "string" == typeof b8.d) && bR(a11, b8, c3)) return;
                  throw TypeError("JSON Web Key for this operation must be a private JWK");
                case "encrypt":
                case "verify":
                  if ("oct" !== b8.kty && void 0 === b8.d && void 0 === b8.priv && bR(a11, b8, c3)) return;
                  throw TypeError("JSON Web Key for this operation must be a public JWK");
              }
              if (!bO(b8)) throw TypeError(bI(a11, b8, "CryptoKey", "KeyObject", "JSON Web Key"));
              if ("secret" === b8.type) throw TypeError(`${bQ(b8)} instances for asymmetric algorithms must not be of type "secret"`);
              if ("public" === b8.type) switch (c3) {
                case "sign":
                  throw TypeError(`${bQ(b8)} instances for asymmetric algorithm signing must be of type "private"`);
                case "decrypt":
                  throw TypeError(`${bQ(b8)} instances for asymmetric algorithm decryption must be of type "private"`);
              }
              if ("private" === b8.type) switch (c3) {
                case "verify":
                  throw TypeError(`${bQ(b8)} instances for asymmetric algorithm verifying must be of type "public"`);
                case "encrypt":
                  throw TypeError(`${bQ(b8)} instances for asymmetric algorithm encryption must be of type "public"`);
              }
            })(j2, m2, n2);
        }
        let o2 = function(...a11) {
          let b8 = new Uint8Array(a11.reduce((a12, { length: b9 }) => a12 + b9, 0)), c3 = 0;
          for (let d3 of a11) b8.set(d3, c3), c3 += d3.length;
          return b8;
        }(void 0 !== a10.protected ? bu(a10.protected) : new Uint8Array(), bu("."), "string" == typeof a10.payload ? i2 ? bu(a10.payload) : bs.encode(a10.payload) : a10.payload);
        try {
          d2 = bv(a10.signature);
        } catch {
          throw new bB("Failed to base64url decode the signature");
        }
        let p2 = await bU(b7, j2);
        if (!await bK(j2, p2, d2, o2)) throw new bE();
        if (i2) try {
          e2 = bv(a10.payload);
        } catch {
          throw new bB("Failed to base64url decode the payload");
        }
        else e2 = "string" == typeof a10.payload ? bs.encode(a10.payload) : a10.payload;
        let q2 = { payload: e2 };
        return (void 0 !== a10.protected && (q2.protectedHeader = f2), void 0 !== a10.header && (q2.unprotectedHeader = a10.header), l2) ? { ...q2, key: p2 } : q2;
      }
      async function bW(a10, b7, c2) {
        if (a10 instanceof Uint8Array && (a10 = bt.decode(a10)), "string" != typeof a10) throw new bB("Compact JWS must be a string or Uint8Array");
        let { 0: d2, 1: e2, 2: f2, length: g2 } = a10.split(".");
        if (3 !== g2) throw new bB("Invalid Compact JWS");
        let h2 = await bV({ payload: e2, protected: d2, signature: f2 }, b7, c2), i2 = { payload: h2.payload, protectedHeader: h2.protectedHeader };
        return "function" == typeof b7 ? { ...i2, key: h2.key } : i2;
      }
      let bX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
      function bY(a10) {
        let b7, c2 = bX.exec(a10);
        if (!c2 || c2[4] && c2[1]) throw TypeError("Invalid time period format");
        let d2 = parseFloat(c2[2]);
        switch (c2[3].toLowerCase()) {
          case "sec":
          case "secs":
          case "second":
          case "seconds":
          case "s":
            b7 = Math.round(d2);
            break;
          case "minute":
          case "minutes":
          case "min":
          case "mins":
          case "m":
            b7 = Math.round(60 * d2);
            break;
          case "hour":
          case "hours":
          case "hr":
          case "hrs":
          case "h":
            b7 = Math.round(3600 * d2);
            break;
          case "day":
          case "days":
          case "d":
            b7 = Math.round(86400 * d2);
            break;
          case "week":
          case "weeks":
          case "w":
            b7 = Math.round(604800 * d2);
            break;
          default:
            b7 = Math.round(31557600 * d2);
        }
        return "-" === c2[1] || "ago" === c2[4] ? -b7 : b7;
      }
      let bZ = (a10) => a10.includes("/") ? a10.toLowerCase() : `application/${a10.toLowerCase()}`;
      async function b$(a10, b7, c2) {
        let d2 = await bW(a10, b7, c2);
        if (d2.protectedHeader.crit?.includes("b64") && false === d2.protectedHeader.b64) throw new bC("JWTs MUST NOT use unencoded payload");
        let e2 = { payload: function(a11, b8, c3 = {}) {
          var d3, e3;
          let f2, g2;
          try {
            f2 = JSON.parse(bt.decode(b8));
          } catch {
          }
          if (!bL(f2)) throw new bC("JWT Claims Set must be a top-level JSON object");
          let { typ: h2 } = c3;
          if (h2 && ("string" != typeof a11.typ || bZ(a11.typ) !== bZ(h2))) throw new bx('unexpected "typ" JWT header value', f2, "typ", "check_failed");
          let { requiredClaims: i2 = [], issuer: j2, subject: k2, audience: l2, maxTokenAge: m2 } = c3, n2 = [...i2];
          for (let a12 of (void 0 !== m2 && n2.push("iat"), void 0 !== l2 && n2.push("aud"), void 0 !== k2 && n2.push("sub"), void 0 !== j2 && n2.push("iss"), new Set(n2.reverse()))) if (!(a12 in f2)) throw new bx(`missing required "${a12}" claim`, f2, a12, "missing");
          if (j2 && !(Array.isArray(j2) ? j2 : [j2]).includes(f2.iss)) throw new bx('unexpected "iss" claim value', f2, "iss", "check_failed");
          if (k2 && f2.sub !== k2) throw new bx('unexpected "sub" claim value', f2, "sub", "check_failed");
          if (l2 && (d3 = f2.aud, e3 = "string" == typeof l2 ? [l2] : l2, "string" == typeof d3 ? !e3.includes(d3) : !(Array.isArray(d3) && e3.some(Set.prototype.has.bind(new Set(d3)))))) throw new bx('unexpected "aud" claim value', f2, "aud", "check_failed");
          switch (typeof c3.clockTolerance) {
            case "string":
              g2 = bY(c3.clockTolerance);
              break;
            case "number":
              g2 = c3.clockTolerance;
              break;
            case "undefined":
              g2 = 0;
              break;
            default:
              throw TypeError("Invalid clockTolerance option type");
          }
          let { currentDate: o2 } = c3, p2 = Math.floor((o2 || /* @__PURE__ */ new Date()).getTime() / 1e3);
          if ((void 0 !== f2.iat || m2) && "number" != typeof f2.iat) throw new bx('"iat" claim must be a number', f2, "iat", "invalid");
          if (void 0 !== f2.nbf) {
            if ("number" != typeof f2.nbf) throw new bx('"nbf" claim must be a number', f2, "nbf", "invalid");
            if (f2.nbf > p2 + g2) throw new bx('"nbf" claim timestamp check failed', f2, "nbf", "check_failed");
          }
          if (void 0 !== f2.exp) {
            if ("number" != typeof f2.exp) throw new bx('"exp" claim must be a number', f2, "exp", "invalid");
            if (f2.exp <= p2 - g2) throw new by('"exp" claim timestamp check failed', f2, "exp", "check_failed");
          }
          if (m2) {
            let a12 = p2 - f2.iat;
            if (a12 - g2 > ("number" == typeof m2 ? m2 : bY(m2))) throw new by('"iat" claim timestamp check failed (too far in the past)', f2, "iat", "check_failed");
            if (a12 < 0 - g2) throw new bx('"iat" claim timestamp check failed (it should be in the past)', f2, "iat", "check_failed");
          }
          return f2;
        }(d2.protectedHeader, d2.payload, c2), protectedHeader: d2.protectedHeader };
        return "function" == typeof b7 ? { ...e2, key: d2.key } : e2;
      }
      function b_(a10, b7) {
        let c2 = a10.headers;
        return c2.set("X-Frame-Options", "DENY"), c2.set("X-Content-Type-Options", "nosniff"), c2.set("Referrer-Policy", "strict-origin-when-cross-origin"), c2.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), interest-cohort=()"), c2.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"), c2.set("Cross-Origin-Opener-Policy", "same-origin"), c2.set("Cross-Origin-Embedder-Policy", "require-corp"), c2.set("Cross-Origin-Resource-Policy", "same-origin"), c2.set("Cache-Control", "no-store, no-cache, must-revalidate, private"), c2.set("Pragma", "no-cache"), c2.set("Content-Security-Policy", `default-src 'self'; script-src 'self' 'nonce-${b7}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; worker-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`), a10;
      }
      async function b0(a10) {
        let { pathname: b7 } = a10.nextUrl;
        if (!b7.startsWith("/admin")) return ad.next();
        let c2 = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))), d2 = crypto.randomUUID(), e2 = (process.env.ADMIN_ALLOWED_IPS ?? "").split(",").map((a11) => a11.trim()).filter(Boolean);
        if (e2.length > 0) {
          let b8 = a10.headers.get("cf-connecting-ip") ?? a10.headers.get("x-real-ip") ?? a10.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
          if (!function(a11, b9) {
            if (!a11 || 0 === b9.length) return true;
            let c3 = a11.replace(/^::ffff:/, "").trim(), d3 = c3.split(".");
            if (4 !== d3.length) return false;
            let e3 = d3.reduce((a12, b10) => a12 << 8 | parseInt(b10, 10), 0) >>> 0;
            for (let a12 of b9) if (a12.includes("/")) {
              let b10 = function(a13) {
                let [b11, c4] = a13.split("/");
                if (!b11) return null;
                let d4 = c4 ? parseInt(c4, 10) : 32, e4 = b11.split(".").reduce((a14, b12) => a14 << 8 | parseInt(b12, 10), 0) >>> 0, f3 = 0 === d4 ? 0 : 4294967295 << 32 - d4 >>> 0;
                return [e4 & f3, f3];
              }(a12);
              if (b10 && (e3 & b10[1]) === b10[0]) return true;
            } else if (a12.trim() === c3) return true;
            return false;
          }(b8, e2)) return console.warn(`[middleware] IP blocked: ${b8} \u2014 request ${d2}`), new ad(null, { status: 404 });
        }
        if ("/admin/login" === b7) {
          let a11 = ad.next();
          return a11.headers.set("x-nonce", c2), a11.headers.set("x-request-id", d2), b_(a11, c2);
        }
        let f2 = a10.cookies.get("admin_session")?.value;
        if (!f2) return ad.redirect(new URL("/admin/login", a10.url));
        try {
          let b8 = process.env.ADMIN_JWT_SECRET;
          if (!b8) return console.error("[middleware] ADMIN_JWT_SECRET not configured"), ad.redirect(new URL("/admin/login", a10.url));
          let { payload: e3 } = await b$(f2, new TextEncoder().encode(b8), { issuer: "ilbuoncaffe:admin", algorithms: ["HS256"] });
          if ("admin" !== e3.role) return ad.redirect(new URL("/admin/login", a10.url));
          let g2 = ad.next();
          return g2.headers.set("x-nonce", c2), g2.headers.set("x-request-id", d2), b_(g2, c2);
        } catch {
          let b8 = ad.redirect(new URL("/admin/login", a10.url));
          return b8.cookies.delete({ name: "admin_session", path: "/" }), b8;
        }
      }
      let b1 = { matcher: ["/admin/:path*"] };
      Object.values({ NOT_FOUND: 404, FORBIDDEN: 403, UNAUTHORIZED: 401 });
      let b2 = { ...s }, b3 = "/src/middleware", b4 = (0, b2.middleware || b2.default);
      class b5 extends Error {
        constructor(a10) {
          super(a10), this.stack = "";
        }
      }
      if ("function" != typeof b4) throw new b5(`The Middleware file "${b3}" must export a function named \`middleware\` or a default function.`);
      let b6 = (a10) => bq({ ...a10, page: b3, handler: async (...a11) => {
        try {
          return await b4(...a11);
        } catch (e2) {
          let b7 = a11[0], c2 = new URL(b7.url), d2 = c2.pathname + c2.search;
          throw await w(e2, { path: d2, method: b7.method, headers: Object.fromEntries(b7.headers.entries()) }, { routerKind: "Pages Router", routePath: "/proxy", routeType: "proxy", revalidateReason: void 0 }), e2;
        }
      } });
    }, 76: (a, b, c) => {
      (() => {
        "use strict";
        let b2, d, e, f, g;
        var h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x = { 491: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.ContextAPI = void 0;
          let d2 = c2(223), e2 = c2(172), f2 = c2(930), g2 = "context", h2 = new d2.NoopContextManager();
          class i2 {
            static getInstance() {
              return this._instance || (this._instance = new i2()), this._instance;
            }
            setGlobalContextManager(a3) {
              return (0, e2.registerGlobal)(g2, a3, f2.DiagAPI.instance());
            }
            active() {
              return this._getContextManager().active();
            }
            with(a3, b4, c3, ...d3) {
              return this._getContextManager().with(a3, b4, c3, ...d3);
            }
            bind(a3, b4) {
              return this._getContextManager().bind(a3, b4);
            }
            _getContextManager() {
              return (0, e2.getGlobal)(g2) || h2;
            }
            disable() {
              this._getContextManager().disable(), (0, e2.unregisterGlobal)(g2, f2.DiagAPI.instance());
            }
          }
          b3.ContextAPI = i2;
        }, 930: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.DiagAPI = void 0;
          let d2 = c2(56), e2 = c2(912), f2 = c2(957), g2 = c2(172);
          class h2 {
            constructor() {
              function a3(a4) {
                return function(...b5) {
                  let c3 = (0, g2.getGlobal)("diag");
                  if (c3) return c3[a4](...b5);
                };
              }
              const b4 = this;
              b4.setLogger = (a4, c3 = { logLevel: f2.DiagLogLevel.INFO }) => {
                var d3, h3, i2;
                if (a4 === b4) {
                  let a5 = Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
                  return b4.error(null != (d3 = a5.stack) ? d3 : a5.message), false;
                }
                "number" == typeof c3 && (c3 = { logLevel: c3 });
                let j2 = (0, g2.getGlobal)("diag"), k2 = (0, e2.createLogLevelDiagLogger)(null != (h3 = c3.logLevel) ? h3 : f2.DiagLogLevel.INFO, a4);
                if (j2 && !c3.suppressOverrideMessage) {
                  let a5 = null != (i2 = Error().stack) ? i2 : "<failed to generate stacktrace>";
                  j2.warn(`Current logger will be overwritten from ${a5}`), k2.warn(`Current logger will overwrite one already registered from ${a5}`);
                }
                return (0, g2.registerGlobal)("diag", k2, b4, true);
              }, b4.disable = () => {
                (0, g2.unregisterGlobal)("diag", b4);
              }, b4.createComponentLogger = (a4) => new d2.DiagComponentLogger(a4), b4.verbose = a3("verbose"), b4.debug = a3("debug"), b4.info = a3("info"), b4.warn = a3("warn"), b4.error = a3("error");
            }
            static instance() {
              return this._instance || (this._instance = new h2()), this._instance;
            }
          }
          b3.DiagAPI = h2;
        }, 653: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.MetricsAPI = void 0;
          let d2 = c2(660), e2 = c2(172), f2 = c2(930), g2 = "metrics";
          class h2 {
            static getInstance() {
              return this._instance || (this._instance = new h2()), this._instance;
            }
            setGlobalMeterProvider(a3) {
              return (0, e2.registerGlobal)(g2, a3, f2.DiagAPI.instance());
            }
            getMeterProvider() {
              return (0, e2.getGlobal)(g2) || d2.NOOP_METER_PROVIDER;
            }
            getMeter(a3, b4, c3) {
              return this.getMeterProvider().getMeter(a3, b4, c3);
            }
            disable() {
              (0, e2.unregisterGlobal)(g2, f2.DiagAPI.instance());
            }
          }
          b3.MetricsAPI = h2;
        }, 181: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.PropagationAPI = void 0;
          let d2 = c2(172), e2 = c2(874), f2 = c2(194), g2 = c2(277), h2 = c2(369), i2 = c2(930), j2 = "propagation", k2 = new e2.NoopTextMapPropagator();
          class l2 {
            constructor() {
              this.createBaggage = h2.createBaggage, this.getBaggage = g2.getBaggage, this.getActiveBaggage = g2.getActiveBaggage, this.setBaggage = g2.setBaggage, this.deleteBaggage = g2.deleteBaggage;
            }
            static getInstance() {
              return this._instance || (this._instance = new l2()), this._instance;
            }
            setGlobalPropagator(a3) {
              return (0, d2.registerGlobal)(j2, a3, i2.DiagAPI.instance());
            }
            inject(a3, b4, c3 = f2.defaultTextMapSetter) {
              return this._getGlobalPropagator().inject(a3, b4, c3);
            }
            extract(a3, b4, c3 = f2.defaultTextMapGetter) {
              return this._getGlobalPropagator().extract(a3, b4, c3);
            }
            fields() {
              return this._getGlobalPropagator().fields();
            }
            disable() {
              (0, d2.unregisterGlobal)(j2, i2.DiagAPI.instance());
            }
            _getGlobalPropagator() {
              return (0, d2.getGlobal)(j2) || k2;
            }
          }
          b3.PropagationAPI = l2;
        }, 997: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.TraceAPI = void 0;
          let d2 = c2(172), e2 = c2(846), f2 = c2(139), g2 = c2(607), h2 = c2(930), i2 = "trace";
          class j2 {
            constructor() {
              this._proxyTracerProvider = new e2.ProxyTracerProvider(), this.wrapSpanContext = f2.wrapSpanContext, this.isSpanContextValid = f2.isSpanContextValid, this.deleteSpan = g2.deleteSpan, this.getSpan = g2.getSpan, this.getActiveSpan = g2.getActiveSpan, this.getSpanContext = g2.getSpanContext, this.setSpan = g2.setSpan, this.setSpanContext = g2.setSpanContext;
            }
            static getInstance() {
              return this._instance || (this._instance = new j2()), this._instance;
            }
            setGlobalTracerProvider(a3) {
              let b4 = (0, d2.registerGlobal)(i2, this._proxyTracerProvider, h2.DiagAPI.instance());
              return b4 && this._proxyTracerProvider.setDelegate(a3), b4;
            }
            getTracerProvider() {
              return (0, d2.getGlobal)(i2) || this._proxyTracerProvider;
            }
            getTracer(a3, b4) {
              return this.getTracerProvider().getTracer(a3, b4);
            }
            disable() {
              (0, d2.unregisterGlobal)(i2, h2.DiagAPI.instance()), this._proxyTracerProvider = new e2.ProxyTracerProvider();
            }
          }
          b3.TraceAPI = j2;
        }, 277: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.deleteBaggage = b3.setBaggage = b3.getActiveBaggage = b3.getBaggage = void 0;
          let d2 = c2(491), e2 = (0, c2(780).createContextKey)("OpenTelemetry Baggage Key");
          function f2(a3) {
            return a3.getValue(e2) || void 0;
          }
          b3.getBaggage = f2, b3.getActiveBaggage = function() {
            return f2(d2.ContextAPI.getInstance().active());
          }, b3.setBaggage = function(a3, b4) {
            return a3.setValue(e2, b4);
          }, b3.deleteBaggage = function(a3) {
            return a3.deleteValue(e2);
          };
        }, 993: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.BaggageImpl = void 0;
          class c2 {
            constructor(a3) {
              this._entries = a3 ? new Map(a3) : /* @__PURE__ */ new Map();
            }
            getEntry(a3) {
              let b4 = this._entries.get(a3);
              if (b4) return Object.assign({}, b4);
            }
            getAllEntries() {
              return Array.from(this._entries.entries()).map(([a3, b4]) => [a3, b4]);
            }
            setEntry(a3, b4) {
              let d2 = new c2(this._entries);
              return d2._entries.set(a3, b4), d2;
            }
            removeEntry(a3) {
              let b4 = new c2(this._entries);
              return b4._entries.delete(a3), b4;
            }
            removeEntries(...a3) {
              let b4 = new c2(this._entries);
              for (let c3 of a3) b4._entries.delete(c3);
              return b4;
            }
            clear() {
              return new c2();
            }
          }
          b3.BaggageImpl = c2;
        }, 830: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.baggageEntryMetadataSymbol = void 0, b3.baggageEntryMetadataSymbol = Symbol("BaggageEntryMetadata");
        }, 369: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.baggageEntryMetadataFromString = b3.createBaggage = void 0;
          let d2 = c2(930), e2 = c2(993), f2 = c2(830), g2 = d2.DiagAPI.instance();
          b3.createBaggage = function(a3 = {}) {
            return new e2.BaggageImpl(new Map(Object.entries(a3)));
          }, b3.baggageEntryMetadataFromString = function(a3) {
            return "string" != typeof a3 && (g2.error(`Cannot create baggage metadata from unknown type: ${typeof a3}`), a3 = ""), { __TYPE__: f2.baggageEntryMetadataSymbol, toString: () => a3 };
          };
        }, 67: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.context = void 0, b3.context = c2(491).ContextAPI.getInstance();
        }, 223: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.NoopContextManager = void 0;
          let d2 = c2(780);
          class e2 {
            active() {
              return d2.ROOT_CONTEXT;
            }
            with(a3, b4, c3, ...d3) {
              return b4.call(c3, ...d3);
            }
            bind(a3, b4) {
              return b4;
            }
            enable() {
              return this;
            }
            disable() {
              return this;
            }
          }
          b3.NoopContextManager = e2;
        }, 780: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.ROOT_CONTEXT = b3.createContextKey = void 0, b3.createContextKey = function(a3) {
            return Symbol.for(a3);
          };
          class c2 {
            constructor(a3) {
              const b4 = this;
              b4._currentContext = a3 ? new Map(a3) : /* @__PURE__ */ new Map(), b4.getValue = (a4) => b4._currentContext.get(a4), b4.setValue = (a4, d2) => {
                let e2 = new c2(b4._currentContext);
                return e2._currentContext.set(a4, d2), e2;
              }, b4.deleteValue = (a4) => {
                let d2 = new c2(b4._currentContext);
                return d2._currentContext.delete(a4), d2;
              };
            }
          }
          b3.ROOT_CONTEXT = new c2();
        }, 506: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.diag = void 0, b3.diag = c2(930).DiagAPI.instance();
        }, 56: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.DiagComponentLogger = void 0;
          let d2 = c2(172);
          class e2 {
            constructor(a3) {
              this._namespace = a3.namespace || "DiagComponentLogger";
            }
            debug(...a3) {
              return f2("debug", this._namespace, a3);
            }
            error(...a3) {
              return f2("error", this._namespace, a3);
            }
            info(...a3) {
              return f2("info", this._namespace, a3);
            }
            warn(...a3) {
              return f2("warn", this._namespace, a3);
            }
            verbose(...a3) {
              return f2("verbose", this._namespace, a3);
            }
          }
          function f2(a3, b4, c3) {
            let e3 = (0, d2.getGlobal)("diag");
            if (e3) return c3.unshift(b4), e3[a3](...c3);
          }
          b3.DiagComponentLogger = e2;
        }, 972: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.DiagConsoleLogger = void 0;
          let c2 = [{ n: "error", c: "error" }, { n: "warn", c: "warn" }, { n: "info", c: "info" }, { n: "debug", c: "debug" }, { n: "verbose", c: "trace" }];
          class d2 {
            constructor() {
              for (let a3 = 0; a3 < c2.length; a3++) this[c2[a3].n] = /* @__PURE__ */ function(a4) {
                return function(...b4) {
                  if (console) {
                    let c3 = console[a4];
                    if ("function" != typeof c3 && (c3 = console.log), "function" == typeof c3) return c3.apply(console, b4);
                  }
                };
              }(c2[a3].c);
            }
          }
          b3.DiagConsoleLogger = d2;
        }, 912: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.createLogLevelDiagLogger = void 0;
          let d2 = c2(957);
          b3.createLogLevelDiagLogger = function(a3, b4) {
            function c3(c4, d3) {
              let e2 = b4[c4];
              return "function" == typeof e2 && a3 >= d3 ? e2.bind(b4) : function() {
              };
            }
            return a3 < d2.DiagLogLevel.NONE ? a3 = d2.DiagLogLevel.NONE : a3 > d2.DiagLogLevel.ALL && (a3 = d2.DiagLogLevel.ALL), b4 = b4 || {}, { error: c3("error", d2.DiagLogLevel.ERROR), warn: c3("warn", d2.DiagLogLevel.WARN), info: c3("info", d2.DiagLogLevel.INFO), debug: c3("debug", d2.DiagLogLevel.DEBUG), verbose: c3("verbose", d2.DiagLogLevel.VERBOSE) };
          };
        }, 957: (a2, b3) => {
          var c2;
          Object.defineProperty(b3, "__esModule", { value: true }), b3.DiagLogLevel = void 0, (c2 = b3.DiagLogLevel || (b3.DiagLogLevel = {}))[c2.NONE = 0] = "NONE", c2[c2.ERROR = 30] = "ERROR", c2[c2.WARN = 50] = "WARN", c2[c2.INFO = 60] = "INFO", c2[c2.DEBUG = 70] = "DEBUG", c2[c2.VERBOSE = 80] = "VERBOSE", c2[c2.ALL = 9999] = "ALL";
        }, 172: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.unregisterGlobal = b3.getGlobal = b3.registerGlobal = void 0;
          let d2 = c2(200), e2 = c2(521), f2 = c2(130), g2 = e2.VERSION.split(".")[0], h2 = Symbol.for(`opentelemetry.js.api.${g2}`), i2 = d2._globalThis;
          b3.registerGlobal = function(a3, b4, c3, d3 = false) {
            var f3;
            let g3 = i2[h2] = null != (f3 = i2[h2]) ? f3 : { version: e2.VERSION };
            if (!d3 && g3[a3]) {
              let b5 = Error(`@opentelemetry/api: Attempted duplicate registration of API: ${a3}`);
              return c3.error(b5.stack || b5.message), false;
            }
            if (g3.version !== e2.VERSION) {
              let b5 = Error(`@opentelemetry/api: Registration of version v${g3.version} for ${a3} does not match previously registered API v${e2.VERSION}`);
              return c3.error(b5.stack || b5.message), false;
            }
            return g3[a3] = b4, c3.debug(`@opentelemetry/api: Registered a global for ${a3} v${e2.VERSION}.`), true;
          }, b3.getGlobal = function(a3) {
            var b4, c3;
            let d3 = null == (b4 = i2[h2]) ? void 0 : b4.version;
            if (d3 && (0, f2.isCompatible)(d3)) return null == (c3 = i2[h2]) ? void 0 : c3[a3];
          }, b3.unregisterGlobal = function(a3, b4) {
            b4.debug(`@opentelemetry/api: Unregistering a global for ${a3} v${e2.VERSION}.`);
            let c3 = i2[h2];
            c3 && delete c3[a3];
          };
        }, 130: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.isCompatible = b3._makeCompatibilityCheck = void 0;
          let d2 = c2(521), e2 = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
          function f2(a3) {
            let b4 = /* @__PURE__ */ new Set([a3]), c3 = /* @__PURE__ */ new Set(), d3 = a3.match(e2);
            if (!d3) return () => false;
            let f3 = { major: +d3[1], minor: +d3[2], patch: +d3[3], prerelease: d3[4] };
            if (null != f3.prerelease) return function(b5) {
              return b5 === a3;
            };
            function g2(a4) {
              return c3.add(a4), false;
            }
            return function(a4) {
              if (b4.has(a4)) return true;
              if (c3.has(a4)) return false;
              let d4 = a4.match(e2);
              if (!d4) return g2(a4);
              let h2 = { major: +d4[1], minor: +d4[2], patch: +d4[3], prerelease: d4[4] };
              if (null != h2.prerelease || f3.major !== h2.major) return g2(a4);
              if (0 === f3.major) return f3.minor === h2.minor && f3.patch <= h2.patch ? (b4.add(a4), true) : g2(a4);
              return f3.minor <= h2.minor ? (b4.add(a4), true) : g2(a4);
            };
          }
          b3._makeCompatibilityCheck = f2, b3.isCompatible = f2(d2.VERSION);
        }, 886: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.metrics = void 0, b3.metrics = c2(653).MetricsAPI.getInstance();
        }, 901: (a2, b3) => {
          var c2;
          Object.defineProperty(b3, "__esModule", { value: true }), b3.ValueType = void 0, (c2 = b3.ValueType || (b3.ValueType = {}))[c2.INT = 0] = "INT", c2[c2.DOUBLE = 1] = "DOUBLE";
        }, 102: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.createNoopMeter = b3.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = b3.NOOP_OBSERVABLE_GAUGE_METRIC = b3.NOOP_OBSERVABLE_COUNTER_METRIC = b3.NOOP_UP_DOWN_COUNTER_METRIC = b3.NOOP_HISTOGRAM_METRIC = b3.NOOP_COUNTER_METRIC = b3.NOOP_METER = b3.NoopObservableUpDownCounterMetric = b3.NoopObservableGaugeMetric = b3.NoopObservableCounterMetric = b3.NoopObservableMetric = b3.NoopHistogramMetric = b3.NoopUpDownCounterMetric = b3.NoopCounterMetric = b3.NoopMetric = b3.NoopMeter = void 0;
          class c2 {
            createHistogram(a3, c3) {
              return b3.NOOP_HISTOGRAM_METRIC;
            }
            createCounter(a3, c3) {
              return b3.NOOP_COUNTER_METRIC;
            }
            createUpDownCounter(a3, c3) {
              return b3.NOOP_UP_DOWN_COUNTER_METRIC;
            }
            createObservableGauge(a3, c3) {
              return b3.NOOP_OBSERVABLE_GAUGE_METRIC;
            }
            createObservableCounter(a3, c3) {
              return b3.NOOP_OBSERVABLE_COUNTER_METRIC;
            }
            createObservableUpDownCounter(a3, c3) {
              return b3.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
            }
            addBatchObservableCallback(a3, b4) {
            }
            removeBatchObservableCallback(a3) {
            }
          }
          b3.NoopMeter = c2;
          class d2 {
          }
          b3.NoopMetric = d2;
          class e2 extends d2 {
            add(a3, b4) {
            }
          }
          b3.NoopCounterMetric = e2;
          class f2 extends d2 {
            add(a3, b4) {
            }
          }
          b3.NoopUpDownCounterMetric = f2;
          class g2 extends d2 {
            record(a3, b4) {
            }
          }
          b3.NoopHistogramMetric = g2;
          class h2 {
            addCallback(a3) {
            }
            removeCallback(a3) {
            }
          }
          b3.NoopObservableMetric = h2;
          class i2 extends h2 {
          }
          b3.NoopObservableCounterMetric = i2;
          class j2 extends h2 {
          }
          b3.NoopObservableGaugeMetric = j2;
          class k2 extends h2 {
          }
          b3.NoopObservableUpDownCounterMetric = k2, b3.NOOP_METER = new c2(), b3.NOOP_COUNTER_METRIC = new e2(), b3.NOOP_HISTOGRAM_METRIC = new g2(), b3.NOOP_UP_DOWN_COUNTER_METRIC = new f2(), b3.NOOP_OBSERVABLE_COUNTER_METRIC = new i2(), b3.NOOP_OBSERVABLE_GAUGE_METRIC = new j2(), b3.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new k2(), b3.createNoopMeter = function() {
            return b3.NOOP_METER;
          };
        }, 660: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.NOOP_METER_PROVIDER = b3.NoopMeterProvider = void 0;
          let d2 = c2(102);
          class e2 {
            getMeter(a3, b4, c3) {
              return d2.NOOP_METER;
            }
          }
          b3.NoopMeterProvider = e2, b3.NOOP_METER_PROVIDER = new e2();
        }, 200: function(a2, b3, c2) {
          var d2 = this && this.__createBinding || (Object.create ? function(a3, b4, c3, d3) {
            void 0 === d3 && (d3 = c3), Object.defineProperty(a3, d3, { enumerable: true, get: function() {
              return b4[c3];
            } });
          } : function(a3, b4, c3, d3) {
            void 0 === d3 && (d3 = c3), a3[d3] = b4[c3];
          }), e2 = this && this.__exportStar || function(a3, b4) {
            for (var c3 in a3) "default" === c3 || Object.prototype.hasOwnProperty.call(b4, c3) || d2(b4, a3, c3);
          };
          Object.defineProperty(b3, "__esModule", { value: true }), e2(c2(46), b3);
        }, 651: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3._globalThis = void 0, b3._globalThis = "object" == typeof globalThis ? globalThis : c.g;
        }, 46: function(a2, b3, c2) {
          var d2 = this && this.__createBinding || (Object.create ? function(a3, b4, c3, d3) {
            void 0 === d3 && (d3 = c3), Object.defineProperty(a3, d3, { enumerable: true, get: function() {
              return b4[c3];
            } });
          } : function(a3, b4, c3, d3) {
            void 0 === d3 && (d3 = c3), a3[d3] = b4[c3];
          }), e2 = this && this.__exportStar || function(a3, b4) {
            for (var c3 in a3) "default" === c3 || Object.prototype.hasOwnProperty.call(b4, c3) || d2(b4, a3, c3);
          };
          Object.defineProperty(b3, "__esModule", { value: true }), e2(c2(651), b3);
        }, 939: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.propagation = void 0, b3.propagation = c2(181).PropagationAPI.getInstance();
        }, 874: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.NoopTextMapPropagator = void 0;
          class c2 {
            inject(a3, b4) {
            }
            extract(a3, b4) {
              return a3;
            }
            fields() {
              return [];
            }
          }
          b3.NoopTextMapPropagator = c2;
        }, 194: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.defaultTextMapSetter = b3.defaultTextMapGetter = void 0, b3.defaultTextMapGetter = { get(a3, b4) {
            if (null != a3) return a3[b4];
          }, keys: (a3) => null == a3 ? [] : Object.keys(a3) }, b3.defaultTextMapSetter = { set(a3, b4, c2) {
            null != a3 && (a3[b4] = c2);
          } };
        }, 845: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.trace = void 0, b3.trace = c2(997).TraceAPI.getInstance();
        }, 403: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.NonRecordingSpan = void 0;
          let d2 = c2(476);
          class e2 {
            constructor(a3 = d2.INVALID_SPAN_CONTEXT) {
              this._spanContext = a3;
            }
            spanContext() {
              return this._spanContext;
            }
            setAttribute(a3, b4) {
              return this;
            }
            setAttributes(a3) {
              return this;
            }
            addEvent(a3, b4) {
              return this;
            }
            setStatus(a3) {
              return this;
            }
            updateName(a3) {
              return this;
            }
            end(a3) {
            }
            isRecording() {
              return false;
            }
            recordException(a3, b4) {
            }
          }
          b3.NonRecordingSpan = e2;
        }, 614: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.NoopTracer = void 0;
          let d2 = c2(491), e2 = c2(607), f2 = c2(403), g2 = c2(139), h2 = d2.ContextAPI.getInstance();
          class i2 {
            startSpan(a3, b4, c3 = h2.active()) {
              var d3;
              if (null == b4 ? void 0 : b4.root) return new f2.NonRecordingSpan();
              let i3 = c3 && (0, e2.getSpanContext)(c3);
              return "object" == typeof (d3 = i3) && "string" == typeof d3.spanId && "string" == typeof d3.traceId && "number" == typeof d3.traceFlags && (0, g2.isSpanContextValid)(i3) ? new f2.NonRecordingSpan(i3) : new f2.NonRecordingSpan();
            }
            startActiveSpan(a3, b4, c3, d3) {
              let f3, g3, i3;
              if (arguments.length < 2) return;
              2 == arguments.length ? i3 = b4 : 3 == arguments.length ? (f3 = b4, i3 = c3) : (f3 = b4, g3 = c3, i3 = d3);
              let j2 = null != g3 ? g3 : h2.active(), k2 = this.startSpan(a3, f3, j2), l2 = (0, e2.setSpan)(j2, k2);
              return h2.with(l2, i3, void 0, k2);
            }
          }
          b3.NoopTracer = i2;
        }, 124: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.NoopTracerProvider = void 0;
          let d2 = c2(614);
          class e2 {
            getTracer(a3, b4, c3) {
              return new d2.NoopTracer();
            }
          }
          b3.NoopTracerProvider = e2;
        }, 125: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.ProxyTracer = void 0;
          let d2 = new (c2(614)).NoopTracer();
          class e2 {
            constructor(a3, b4, c3, d3) {
              this._provider = a3, this.name = b4, this.version = c3, this.options = d3;
            }
            startSpan(a3, b4, c3) {
              return this._getTracer().startSpan(a3, b4, c3);
            }
            startActiveSpan(a3, b4, c3, d3) {
              let e3 = this._getTracer();
              return Reflect.apply(e3.startActiveSpan, e3, arguments);
            }
            _getTracer() {
              if (this._delegate) return this._delegate;
              let a3 = this._provider.getDelegateTracer(this.name, this.version, this.options);
              return a3 ? (this._delegate = a3, this._delegate) : d2;
            }
          }
          b3.ProxyTracer = e2;
        }, 846: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.ProxyTracerProvider = void 0;
          let d2 = c2(125), e2 = new (c2(124)).NoopTracerProvider();
          class f2 {
            getTracer(a3, b4, c3) {
              var e3;
              return null != (e3 = this.getDelegateTracer(a3, b4, c3)) ? e3 : new d2.ProxyTracer(this, a3, b4, c3);
            }
            getDelegate() {
              var a3;
              return null != (a3 = this._delegate) ? a3 : e2;
            }
            setDelegate(a3) {
              this._delegate = a3;
            }
            getDelegateTracer(a3, b4, c3) {
              var d3;
              return null == (d3 = this._delegate) ? void 0 : d3.getTracer(a3, b4, c3);
            }
          }
          b3.ProxyTracerProvider = f2;
        }, 996: (a2, b3) => {
          var c2;
          Object.defineProperty(b3, "__esModule", { value: true }), b3.SamplingDecision = void 0, (c2 = b3.SamplingDecision || (b3.SamplingDecision = {}))[c2.NOT_RECORD = 0] = "NOT_RECORD", c2[c2.RECORD = 1] = "RECORD", c2[c2.RECORD_AND_SAMPLED = 2] = "RECORD_AND_SAMPLED";
        }, 607: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.getSpanContext = b3.setSpanContext = b3.deleteSpan = b3.setSpan = b3.getActiveSpan = b3.getSpan = void 0;
          let d2 = c2(780), e2 = c2(403), f2 = c2(491), g2 = (0, d2.createContextKey)("OpenTelemetry Context Key SPAN");
          function h2(a3) {
            return a3.getValue(g2) || void 0;
          }
          function i2(a3, b4) {
            return a3.setValue(g2, b4);
          }
          b3.getSpan = h2, b3.getActiveSpan = function() {
            return h2(f2.ContextAPI.getInstance().active());
          }, b3.setSpan = i2, b3.deleteSpan = function(a3) {
            return a3.deleteValue(g2);
          }, b3.setSpanContext = function(a3, b4) {
            return i2(a3, new e2.NonRecordingSpan(b4));
          }, b3.getSpanContext = function(a3) {
            var b4;
            return null == (b4 = h2(a3)) ? void 0 : b4.spanContext();
          };
        }, 325: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.TraceStateImpl = void 0;
          let d2 = c2(564);
          class e2 {
            constructor(a3) {
              this._internalState = /* @__PURE__ */ new Map(), a3 && this._parse(a3);
            }
            set(a3, b4) {
              let c3 = this._clone();
              return c3._internalState.has(a3) && c3._internalState.delete(a3), c3._internalState.set(a3, b4), c3;
            }
            unset(a3) {
              let b4 = this._clone();
              return b4._internalState.delete(a3), b4;
            }
            get(a3) {
              return this._internalState.get(a3);
            }
            serialize() {
              return this._keys().reduce((a3, b4) => (a3.push(b4 + "=" + this.get(b4)), a3), []).join(",");
            }
            _parse(a3) {
              !(a3.length > 512) && (this._internalState = a3.split(",").reverse().reduce((a4, b4) => {
                let c3 = b4.trim(), e3 = c3.indexOf("=");
                if (-1 !== e3) {
                  let f2 = c3.slice(0, e3), g2 = c3.slice(e3 + 1, b4.length);
                  (0, d2.validateKey)(f2) && (0, d2.validateValue)(g2) && a4.set(f2, g2);
                }
                return a4;
              }, /* @__PURE__ */ new Map()), this._internalState.size > 32 && (this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, 32))));
            }
            _keys() {
              return Array.from(this._internalState.keys()).reverse();
            }
            _clone() {
              let a3 = new e2();
              return a3._internalState = new Map(this._internalState), a3;
            }
          }
          b3.TraceStateImpl = e2;
        }, 564: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.validateValue = b3.validateKey = void 0;
          let c2 = "[_0-9a-z-*/]", d2 = `[a-z]${c2}{0,255}`, e2 = `[a-z0-9]${c2}{0,240}@[a-z]${c2}{0,13}`, f2 = RegExp(`^(?:${d2}|${e2})$`), g2 = /^[ -~]{0,255}[!-~]$/, h2 = /,|=/;
          b3.validateKey = function(a3) {
            return f2.test(a3);
          }, b3.validateValue = function(a3) {
            return g2.test(a3) && !h2.test(a3);
          };
        }, 98: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.createTraceState = void 0;
          let d2 = c2(325);
          b3.createTraceState = function(a3) {
            return new d2.TraceStateImpl(a3);
          };
        }, 476: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.INVALID_SPAN_CONTEXT = b3.INVALID_TRACEID = b3.INVALID_SPANID = void 0;
          let d2 = c2(475);
          b3.INVALID_SPANID = "0000000000000000", b3.INVALID_TRACEID = "00000000000000000000000000000000", b3.INVALID_SPAN_CONTEXT = { traceId: b3.INVALID_TRACEID, spanId: b3.INVALID_SPANID, traceFlags: d2.TraceFlags.NONE };
        }, 357: (a2, b3) => {
          var c2;
          Object.defineProperty(b3, "__esModule", { value: true }), b3.SpanKind = void 0, (c2 = b3.SpanKind || (b3.SpanKind = {}))[c2.INTERNAL = 0] = "INTERNAL", c2[c2.SERVER = 1] = "SERVER", c2[c2.CLIENT = 2] = "CLIENT", c2[c2.PRODUCER = 3] = "PRODUCER", c2[c2.CONSUMER = 4] = "CONSUMER";
        }, 139: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.wrapSpanContext = b3.isSpanContextValid = b3.isValidSpanId = b3.isValidTraceId = void 0;
          let d2 = c2(476), e2 = c2(403), f2 = /^([0-9a-f]{32})$/i, g2 = /^[0-9a-f]{16}$/i;
          function h2(a3) {
            return f2.test(a3) && a3 !== d2.INVALID_TRACEID;
          }
          function i2(a3) {
            return g2.test(a3) && a3 !== d2.INVALID_SPANID;
          }
          b3.isValidTraceId = h2, b3.isValidSpanId = i2, b3.isSpanContextValid = function(a3) {
            return h2(a3.traceId) && i2(a3.spanId);
          }, b3.wrapSpanContext = function(a3) {
            return new e2.NonRecordingSpan(a3);
          };
        }, 847: (a2, b3) => {
          var c2;
          Object.defineProperty(b3, "__esModule", { value: true }), b3.SpanStatusCode = void 0, (c2 = b3.SpanStatusCode || (b3.SpanStatusCode = {}))[c2.UNSET = 0] = "UNSET", c2[c2.OK = 1] = "OK", c2[c2.ERROR = 2] = "ERROR";
        }, 475: (a2, b3) => {
          var c2;
          Object.defineProperty(b3, "__esModule", { value: true }), b3.TraceFlags = void 0, (c2 = b3.TraceFlags || (b3.TraceFlags = {}))[c2.NONE = 0] = "NONE", c2[c2.SAMPLED = 1] = "SAMPLED";
        }, 521: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.VERSION = void 0, b3.VERSION = "1.6.0";
        } }, y = {};
        function z(a2) {
          var b3 = y[a2];
          if (void 0 !== b3) return b3.exports;
          var c2 = y[a2] = { exports: {} }, d2 = true;
          try {
            x[a2].call(c2.exports, c2, c2.exports, z), d2 = false;
          } finally {
            d2 && delete y[a2];
          }
          return c2.exports;
        }
        z.ab = "//";
        var A = {};
        Object.defineProperty(A, "__esModule", { value: true }), A.trace = A.propagation = A.metrics = A.diag = A.context = A.INVALID_SPAN_CONTEXT = A.INVALID_TRACEID = A.INVALID_SPANID = A.isValidSpanId = A.isValidTraceId = A.isSpanContextValid = A.createTraceState = A.TraceFlags = A.SpanStatusCode = A.SpanKind = A.SamplingDecision = A.ProxyTracerProvider = A.ProxyTracer = A.defaultTextMapSetter = A.defaultTextMapGetter = A.ValueType = A.createNoopMeter = A.DiagLogLevel = A.DiagConsoleLogger = A.ROOT_CONTEXT = A.createContextKey = A.baggageEntryMetadataFromString = void 0, h = z(369), Object.defineProperty(A, "baggageEntryMetadataFromString", { enumerable: true, get: function() {
          return h.baggageEntryMetadataFromString;
        } }), i = z(780), Object.defineProperty(A, "createContextKey", { enumerable: true, get: function() {
          return i.createContextKey;
        } }), Object.defineProperty(A, "ROOT_CONTEXT", { enumerable: true, get: function() {
          return i.ROOT_CONTEXT;
        } }), j = z(972), Object.defineProperty(A, "DiagConsoleLogger", { enumerable: true, get: function() {
          return j.DiagConsoleLogger;
        } }), k = z(957), Object.defineProperty(A, "DiagLogLevel", { enumerable: true, get: function() {
          return k.DiagLogLevel;
        } }), l = z(102), Object.defineProperty(A, "createNoopMeter", { enumerable: true, get: function() {
          return l.createNoopMeter;
        } }), m = z(901), Object.defineProperty(A, "ValueType", { enumerable: true, get: function() {
          return m.ValueType;
        } }), n = z(194), Object.defineProperty(A, "defaultTextMapGetter", { enumerable: true, get: function() {
          return n.defaultTextMapGetter;
        } }), Object.defineProperty(A, "defaultTextMapSetter", { enumerable: true, get: function() {
          return n.defaultTextMapSetter;
        } }), o = z(125), Object.defineProperty(A, "ProxyTracer", { enumerable: true, get: function() {
          return o.ProxyTracer;
        } }), p = z(846), Object.defineProperty(A, "ProxyTracerProvider", { enumerable: true, get: function() {
          return p.ProxyTracerProvider;
        } }), q = z(996), Object.defineProperty(A, "SamplingDecision", { enumerable: true, get: function() {
          return q.SamplingDecision;
        } }), r = z(357), Object.defineProperty(A, "SpanKind", { enumerable: true, get: function() {
          return r.SpanKind;
        } }), s = z(847), Object.defineProperty(A, "SpanStatusCode", { enumerable: true, get: function() {
          return s.SpanStatusCode;
        } }), t = z(475), Object.defineProperty(A, "TraceFlags", { enumerable: true, get: function() {
          return t.TraceFlags;
        } }), u = z(98), Object.defineProperty(A, "createTraceState", { enumerable: true, get: function() {
          return u.createTraceState;
        } }), v = z(139), Object.defineProperty(A, "isSpanContextValid", { enumerable: true, get: function() {
          return v.isSpanContextValid;
        } }), Object.defineProperty(A, "isValidTraceId", { enumerable: true, get: function() {
          return v.isValidTraceId;
        } }), Object.defineProperty(A, "isValidSpanId", { enumerable: true, get: function() {
          return v.isValidSpanId;
        } }), w = z(476), Object.defineProperty(A, "INVALID_SPANID", { enumerable: true, get: function() {
          return w.INVALID_SPANID;
        } }), Object.defineProperty(A, "INVALID_TRACEID", { enumerable: true, get: function() {
          return w.INVALID_TRACEID;
        } }), Object.defineProperty(A, "INVALID_SPAN_CONTEXT", { enumerable: true, get: function() {
          return w.INVALID_SPAN_CONTEXT;
        } }), b2 = z(67), Object.defineProperty(A, "context", { enumerable: true, get: function() {
          return b2.context;
        } }), d = z(506), Object.defineProperty(A, "diag", { enumerable: true, get: function() {
          return d.diag;
        } }), e = z(886), Object.defineProperty(A, "metrics", { enumerable: true, get: function() {
          return e.metrics;
        } }), f = z(939), Object.defineProperty(A, "propagation", { enumerable: true, get: function() {
          return f.propagation;
        } }), g = z(845), Object.defineProperty(A, "trace", { enumerable: true, get: function() {
          return g.trace;
        } }), A.default = { context: b2.context, diag: d.diag, metrics: e.metrics, propagation: f.propagation, trace: g.trace }, a.exports = A;
      })();
    }, 120: (a, b, c) => {
      "use strict";
      var d = c(356).Buffer;
      Object.defineProperty(b, "__esModule", { value: true });
      var e = { handleFetch: function() {
        return j;
      }, interceptFetch: function() {
        return k;
      }, reader: function() {
        return h;
      } };
      for (var f in e) Object.defineProperty(b, f, { enumerable: true, get: e[f] });
      let g = c(681), h = { url: (a2) => a2.url, header: (a2, b2) => a2.headers.get(b2) };
      async function i(a2, b2) {
        let { url: c2, method: e2, headers: f2, body: g2, cache: h2, credentials: i2, integrity: j2, mode: k2, redirect: l, referrer: m, referrerPolicy: n } = b2;
        return { testData: a2, api: "fetch", request: { url: c2, method: e2, headers: [...Array.from(f2), ["next-test-stack", function() {
          let a3 = (Error().stack ?? "").split("\n");
          for (let b3 = 1; b3 < a3.length; b3++) if (a3[b3].length > 0) {
            a3 = a3.slice(b3);
            break;
          }
          return (a3 = (a3 = (a3 = a3.filter((a4) => !a4.includes("/next/dist/"))).slice(0, 5)).map((a4) => a4.replace("webpack-internal:///(rsc)/", "").trim())).join("    ");
        }()]], body: g2 ? d.from(await b2.arrayBuffer()).toString("base64") : null, cache: h2, credentials: i2, integrity: j2, mode: k2, redirect: l, referrer: m, referrerPolicy: n } };
      }
      async function j(a2, b2) {
        let c2 = (0, g.getTestReqInfo)(b2, h);
        if (!c2) return a2(b2);
        let { testData: e2, proxyPort: f2 } = c2, j2 = await i(e2, b2), k2 = await a2(`http://localhost:${f2}`, { method: "POST", body: JSON.stringify(j2), next: { internal: true } });
        if (!k2.ok) throw Object.defineProperty(Error(`Proxy request failed: ${k2.status}`), "__NEXT_ERROR_CODE", { value: "E146", enumerable: false, configurable: true });
        let l = await k2.json(), { api: m } = l;
        switch (m) {
          case "continue":
            return a2(b2);
          case "abort":
          case "unhandled":
            throw Object.defineProperty(Error(`Proxy request aborted [${b2.method} ${b2.url}]`), "__NEXT_ERROR_CODE", { value: "E145", enumerable: false, configurable: true });
          case "fetch":
            return function(a3) {
              let { status: b3, headers: c3, body: e3 } = a3.response;
              return new Response(e3 ? d.from(e3, "base64") : null, { status: b3, headers: new Headers(c3) });
            }(l);
          default:
            return m;
        }
      }
      function k(a2) {
        return c.g.fetch = function(b2, c2) {
          var d2;
          return (null == c2 || null == (d2 = c2.next) ? void 0 : d2.internal) ? a2(b2, c2) : j(a2, new Request(b2, c2));
        }, () => {
          c.g.fetch = a2;
        };
      }
    }, 233: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
      var d = { interceptTestApis: function() {
        return h;
      }, wrapRequestHandler: function() {
        return i;
      } };
      for (var e in d) Object.defineProperty(b, e, { enumerable: true, get: d[e] });
      let f = c(681), g = c(120);
      function h() {
        return (0, g.interceptFetch)(c.g.fetch);
      }
      function i(a2) {
        return (b2, c2) => (0, f.withRequest)(b2, g.reader, () => a2(b2, c2));
      }
    }, 356: (a) => {
      "use strict";
      a.exports = (init_node_buffer(), __toCommonJS(node_buffer_exports));
    }, 508: (a) => {
      "use strict";
      var b = Object.defineProperty, c = Object.getOwnPropertyDescriptor, d = Object.getOwnPropertyNames, e = Object.prototype.hasOwnProperty, f = {}, g = { RequestCookies: () => n, ResponseCookies: () => o, parseCookie: () => j, parseSetCookie: () => k, stringifyCookie: () => i };
      for (var h in g) b(f, h, { get: g[h], enumerable: true });
      function i(a2) {
        var b2;
        let c2 = ["path" in a2 && a2.path && `Path=${a2.path}`, "expires" in a2 && (a2.expires || 0 === a2.expires) && `Expires=${("number" == typeof a2.expires ? new Date(a2.expires) : a2.expires).toUTCString()}`, "maxAge" in a2 && "number" == typeof a2.maxAge && `Max-Age=${a2.maxAge}`, "domain" in a2 && a2.domain && `Domain=${a2.domain}`, "secure" in a2 && a2.secure && "Secure", "httpOnly" in a2 && a2.httpOnly && "HttpOnly", "sameSite" in a2 && a2.sameSite && `SameSite=${a2.sameSite}`, "partitioned" in a2 && a2.partitioned && "Partitioned", "priority" in a2 && a2.priority && `Priority=${a2.priority}`].filter(Boolean), d2 = `${a2.name}=${encodeURIComponent(null != (b2 = a2.value) ? b2 : "")}`;
        return 0 === c2.length ? d2 : `${d2}; ${c2.join("; ")}`;
      }
      function j(a2) {
        let b2 = /* @__PURE__ */ new Map();
        for (let c2 of a2.split(/; */)) {
          if (!c2) continue;
          let a3 = c2.indexOf("=");
          if (-1 === a3) {
            b2.set(c2, "true");
            continue;
          }
          let [d2, e2] = [c2.slice(0, a3), c2.slice(a3 + 1)];
          try {
            b2.set(d2, decodeURIComponent(null != e2 ? e2 : "true"));
          } catch {
          }
        }
        return b2;
      }
      function k(a2) {
        if (!a2) return;
        let [[b2, c2], ...d2] = j(a2), { domain: e2, expires: f2, httponly: g2, maxage: h2, path: i2, samesite: k2, secure: n2, partitioned: o2, priority: p } = Object.fromEntries(d2.map(([a3, b3]) => [a3.toLowerCase().replace(/-/g, ""), b3]));
        {
          var q, r, s = { name: b2, value: decodeURIComponent(c2), domain: e2, ...f2 && { expires: new Date(f2) }, ...g2 && { httpOnly: true }, ..."string" == typeof h2 && { maxAge: Number(h2) }, path: i2, ...k2 && { sameSite: l.includes(q = (q = k2).toLowerCase()) ? q : void 0 }, ...n2 && { secure: true }, ...p && { priority: m.includes(r = (r = p).toLowerCase()) ? r : void 0 }, ...o2 && { partitioned: true } };
          let a3 = {};
          for (let b3 in s) s[b3] && (a3[b3] = s[b3]);
          return a3;
        }
      }
      a.exports = ((a2, f2, g2, h2) => {
        if (f2 && "object" == typeof f2 || "function" == typeof f2) for (let i2 of d(f2)) e.call(a2, i2) || i2 === g2 || b(a2, i2, { get: () => f2[i2], enumerable: !(h2 = c(f2, i2)) || h2.enumerable });
        return a2;
      })(b({}, "__esModule", { value: true }), f);
      var l = ["strict", "lax", "none"], m = ["low", "medium", "high"], n = class {
        constructor(a2) {
          this._parsed = /* @__PURE__ */ new Map(), this._headers = a2;
          const b2 = a2.get("cookie");
          if (b2) for (const [a3, c2] of j(b2)) this._parsed.set(a3, { name: a3, value: c2 });
        }
        [Symbol.iterator]() {
          return this._parsed[Symbol.iterator]();
        }
        get size() {
          return this._parsed.size;
        }
        get(...a2) {
          let b2 = "string" == typeof a2[0] ? a2[0] : a2[0].name;
          return this._parsed.get(b2);
        }
        getAll(...a2) {
          var b2;
          let c2 = Array.from(this._parsed);
          if (!a2.length) return c2.map(([a3, b3]) => b3);
          let d2 = "string" == typeof a2[0] ? a2[0] : null == (b2 = a2[0]) ? void 0 : b2.name;
          return c2.filter(([a3]) => a3 === d2).map(([a3, b3]) => b3);
        }
        has(a2) {
          return this._parsed.has(a2);
        }
        set(...a2) {
          let [b2, c2] = 1 === a2.length ? [a2[0].name, a2[0].value] : a2, d2 = this._parsed;
          return d2.set(b2, { name: b2, value: c2 }), this._headers.set("cookie", Array.from(d2).map(([a3, b3]) => i(b3)).join("; ")), this;
        }
        delete(a2) {
          let b2 = this._parsed, c2 = Array.isArray(a2) ? a2.map((a3) => b2.delete(a3)) : b2.delete(a2);
          return this._headers.set("cookie", Array.from(b2).map(([a3, b3]) => i(b3)).join("; ")), c2;
        }
        clear() {
          return this.delete(Array.from(this._parsed.keys())), this;
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return `RequestCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
        }
        toString() {
          return [...this._parsed.values()].map((a2) => `${a2.name}=${encodeURIComponent(a2.value)}`).join("; ");
        }
      }, o = class {
        constructor(a2) {
          var b2, c2, d2;
          this._parsed = /* @__PURE__ */ new Map(), this._headers = a2;
          const e2 = null != (d2 = null != (c2 = null == (b2 = a2.getSetCookie) ? void 0 : b2.call(a2)) ? c2 : a2.get("set-cookie")) ? d2 : [];
          for (const a3 of Array.isArray(e2) ? e2 : function(a4) {
            if (!a4) return [];
            var b3, c3, d3, e3, f2, g2 = [], h2 = 0;
            function i2() {
              for (; h2 < a4.length && /\s/.test(a4.charAt(h2)); ) h2 += 1;
              return h2 < a4.length;
            }
            for (; h2 < a4.length; ) {
              for (b3 = h2, f2 = false; i2(); ) if ("," === (c3 = a4.charAt(h2))) {
                for (d3 = h2, h2 += 1, i2(), e3 = h2; h2 < a4.length && "=" !== (c3 = a4.charAt(h2)) && ";" !== c3 && "," !== c3; ) h2 += 1;
                h2 < a4.length && "=" === a4.charAt(h2) ? (f2 = true, h2 = e3, g2.push(a4.substring(b3, d3)), b3 = h2) : h2 = d3 + 1;
              } else h2 += 1;
              (!f2 || h2 >= a4.length) && g2.push(a4.substring(b3, a4.length));
            }
            return g2;
          }(e2)) {
            const b3 = k(a3);
            b3 && this._parsed.set(b3.name, b3);
          }
        }
        get(...a2) {
          let b2 = "string" == typeof a2[0] ? a2[0] : a2[0].name;
          return this._parsed.get(b2);
        }
        getAll(...a2) {
          var b2;
          let c2 = Array.from(this._parsed.values());
          if (!a2.length) return c2;
          let d2 = "string" == typeof a2[0] ? a2[0] : null == (b2 = a2[0]) ? void 0 : b2.name;
          return c2.filter((a3) => a3.name === d2);
        }
        has(a2) {
          return this._parsed.has(a2);
        }
        set(...a2) {
          let [b2, c2, d2] = 1 === a2.length ? [a2[0].name, a2[0].value, a2[0]] : a2, e2 = this._parsed;
          return e2.set(b2, function(a3 = { name: "", value: "" }) {
            return "number" == typeof a3.expires && (a3.expires = new Date(a3.expires)), a3.maxAge && (a3.expires = new Date(Date.now() + 1e3 * a3.maxAge)), (null === a3.path || void 0 === a3.path) && (a3.path = "/"), a3;
          }({ name: b2, value: c2, ...d2 })), function(a3, b3) {
            for (let [, c3] of (b3.delete("set-cookie"), a3)) {
              let a4 = i(c3);
              b3.append("set-cookie", a4);
            }
          }(e2, this._headers), this;
        }
        delete(...a2) {
          let [b2, c2] = "string" == typeof a2[0] ? [a2[0]] : [a2[0].name, a2[0]];
          return this.set({ ...c2, name: b2, value: "", expires: /* @__PURE__ */ new Date(0) });
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return `ResponseCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
        }
        toString() {
          return [...this._parsed.values()].map(i).join("; ");
        }
      };
    }, 521: (a) => {
      "use strict";
      a.exports = (init_node_async_hooks(), __toCommonJS(node_async_hooks_exports));
    }, 587: (a, b) => {
      "use strict";
      Symbol.for("react.transitional.element"), Symbol.for("react.portal"), Symbol.for("react.fragment"), Symbol.for("react.strict_mode"), Symbol.for("react.profiler"), Symbol.for("react.forward_ref"), Symbol.for("react.suspense"), Symbol.for("react.memo"), Symbol.for("react.lazy"), Symbol.for("react.activity"), Symbol.for("react.view_transition"), Symbol.iterator;
      Object.prototype.hasOwnProperty;
    }, 681: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
      var d = { getTestReqInfo: function() {
        return i;
      }, withRequest: function() {
        return h;
      } };
      for (var e in d) Object.defineProperty(b, e, { enumerable: true, get: d[e] });
      let f = new (c(521)).AsyncLocalStorage();
      function g(a2, b2) {
        let c2 = b2.header(a2, "next-test-proxy-port");
        if (!c2) return;
        let d2 = b2.url(a2);
        return { url: d2, proxyPort: Number(c2), testData: b2.header(a2, "next-test-data") || "" };
      }
      function h(a2, b2, c2) {
        let d2 = g(a2, b2);
        return d2 ? f.run(d2, c2) : c2();
      }
      function i(a2, b2) {
        let c2 = f.getStore();
        return c2 || (a2 && b2 ? g(a2, b2) : void 0);
      }
    }, 808: (a, b, c) => {
      var d, e = { 226: function(e2, f2) {
        !function(g2, h) {
          "use strict";
          var i = "function", j = "undefined", k = "object", l = "string", m = "major", n = "model", o = "name", p = "type", q = "vendor", r = "version", s = "architecture", t = "console", u = "mobile", v = "tablet", w = "smarttv", x = "wearable", y = "embedded", z = "Amazon", A = "Apple", B = "ASUS", C = "BlackBerry", D = "Browser", E = "Chrome", F = "Firefox", G = "Google", H = "Huawei", I = "Microsoft", J = "Motorola", K = "Opera", L = "Samsung", M = "Sharp", N = "Sony", O = "Xiaomi", P = "Zebra", Q = "Facebook", R = "Chromium OS", S = "Mac OS", T = function(a2, b2) {
            var c2 = {};
            for (var d2 in a2) b2[d2] && b2[d2].length % 2 == 0 ? c2[d2] = b2[d2].concat(a2[d2]) : c2[d2] = a2[d2];
            return c2;
          }, U = function(a2) {
            for (var b2 = {}, c2 = 0; c2 < a2.length; c2++) b2[a2[c2].toUpperCase()] = a2[c2];
            return b2;
          }, V = function(a2, b2) {
            return typeof a2 === l && -1 !== W(b2).indexOf(W(a2));
          }, W = function(a2) {
            return a2.toLowerCase();
          }, X = function(a2, b2) {
            if (typeof a2 === l) return a2 = a2.replace(/^\s\s*/, ""), typeof b2 === j ? a2 : a2.substring(0, 350);
          }, Y = function(a2, b2) {
            for (var c2, d2, e3, f3, g3, h2, j2 = 0; j2 < b2.length && !g3; ) {
              var l2 = b2[j2], m2 = b2[j2 + 1];
              for (c2 = d2 = 0; c2 < l2.length && !g3 && l2[c2]; ) if (g3 = l2[c2++].exec(a2)) for (e3 = 0; e3 < m2.length; e3++) h2 = g3[++d2], typeof (f3 = m2[e3]) === k && f3.length > 0 ? 2 === f3.length ? typeof f3[1] == i ? this[f3[0]] = f3[1].call(this, h2) : this[f3[0]] = f3[1] : 3 === f3.length ? typeof f3[1] !== i || f3[1].exec && f3[1].test ? this[f3[0]] = h2 ? h2.replace(f3[1], f3[2]) : void 0 : this[f3[0]] = h2 ? f3[1].call(this, h2, f3[2]) : void 0 : 4 === f3.length && (this[f3[0]] = h2 ? f3[3].call(this, h2.replace(f3[1], f3[2])) : void 0) : this[f3] = h2 || void 0;
              j2 += 2;
            }
          }, Z = function(a2, b2) {
            for (var c2 in b2) if (typeof b2[c2] === k && b2[c2].length > 0) {
              for (var d2 = 0; d2 < b2[c2].length; d2++) if (V(b2[c2][d2], a2)) return "?" === c2 ? void 0 : c2;
            } else if (V(b2[c2], a2)) return "?" === c2 ? void 0 : c2;
            return a2;
          }, $ = { ME: "4.90", "NT 3.11": "NT3.51", "NT 4.0": "NT4.0", 2e3: "NT 5.0", XP: ["NT 5.1", "NT 5.2"], Vista: "NT 6.0", 7: "NT 6.1", 8: "NT 6.2", 8.1: "NT 6.3", 10: ["NT 6.4", "NT 10.0"], RT: "ARM" }, _ = { browser: [[/\b(?:crmo|crios)\/([\w\.]+)/i], [r, [o, "Chrome"]], [/edg(?:e|ios|a)?\/([\w\.]+)/i], [r, [o, "Edge"]], [/(opera mini)\/([-\w\.]+)/i, /(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i, /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i], [o, r], [/opios[\/ ]+([\w\.]+)/i], [r, [o, K + " Mini"]], [/\bopr\/([\w\.]+)/i], [r, [o, K]], [/(kindle)\/([\w\.]+)/i, /(lunascape|maxthon|netfront|jasmine|blazer)[\/ ]?([\w\.]*)/i, /(avant |iemobile|slim)(?:browser)?[\/ ]?([\w\.]*)/i, /(ba?idubrowser)[\/ ]?([\w\.]+)/i, /(?:ms|\()(ie) ([\w\.]+)/i, /(flock|rockmelt|midori|epiphany|silk|skyfire|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark|qupzilla|falkon|rekonq|puffin|brave|whale(?!.+naver)|qqbrowserlite|qq|duckduckgo)\/([-\w\.]+)/i, /(heytap|ovi)browser\/([\d\.]+)/i, /(weibo)__([\d\.]+)/i], [o, r], [/(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i], [r, [o, "UC" + D]], [/microm.+\bqbcore\/([\w\.]+)/i, /\bqbcore\/([\w\.]+).+microm/i], [r, [o, "WeChat(Win) Desktop"]], [/micromessenger\/([\w\.]+)/i], [r, [o, "WeChat"]], [/konqueror\/([\w\.]+)/i], [r, [o, "Konqueror"]], [/trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i], [r, [o, "IE"]], [/ya(?:search)?browser\/([\w\.]+)/i], [r, [o, "Yandex"]], [/(avast|avg)\/([\w\.]+)/i], [[o, /(.+)/, "$1 Secure " + D], r], [/\bfocus\/([\w\.]+)/i], [r, [o, F + " Focus"]], [/\bopt\/([\w\.]+)/i], [r, [o, K + " Touch"]], [/coc_coc\w+\/([\w\.]+)/i], [r, [o, "Coc Coc"]], [/dolfin\/([\w\.]+)/i], [r, [o, "Dolphin"]], [/coast\/([\w\.]+)/i], [r, [o, K + " Coast"]], [/miuibrowser\/([\w\.]+)/i], [r, [o, "MIUI " + D]], [/fxios\/([-\w\.]+)/i], [r, [o, F]], [/\bqihu|(qi?ho?o?|360)browser/i], [[o, "360 " + D]], [/(oculus|samsung|sailfish|huawei)browser\/([\w\.]+)/i], [[o, /(.+)/, "$1 " + D], r], [/(comodo_dragon)\/([\w\.]+)/i], [[o, /_/g, " "], r], [/(electron)\/([\w\.]+) safari/i, /(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i, /m?(qqbrowser|baiduboxapp|2345Explorer)[\/ ]?([\w\.]+)/i], [o, r], [/(metasr)[\/ ]?([\w\.]+)/i, /(lbbrowser)/i, /\[(linkedin)app\]/i], [o], [/((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i], [[o, Q], r], [/(kakao(?:talk|story))[\/ ]([\w\.]+)/i, /(naver)\(.*?(\d+\.[\w\.]+).*\)/i, /safari (line)\/([\w\.]+)/i, /\b(line)\/([\w\.]+)\/iab/i, /(chromium|instagram)[\/ ]([-\w\.]+)/i], [o, r], [/\bgsa\/([\w\.]+) .*safari\//i], [r, [o, "GSA"]], [/musical_ly(?:.+app_?version\/|_)([\w\.]+)/i], [r, [o, "TikTok"]], [/headlesschrome(?:\/([\w\.]+)| )/i], [r, [o, E + " Headless"]], [/ wv\).+(chrome)\/([\w\.]+)/i], [[o, E + " WebView"], r], [/droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i], [r, [o, "Android " + D]], [/(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i], [o, r], [/version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i], [r, [o, "Mobile Safari"]], [/version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i], [r, o], [/webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i], [o, [r, Z, { "1.0": "/8", 1.2: "/1", 1.3: "/3", "2.0": "/412", "2.0.2": "/416", "2.0.3": "/417", "2.0.4": "/419", "?": "/" }]], [/(webkit|khtml)\/([\w\.]+)/i], [o, r], [/(navigator|netscape\d?)\/([-\w\.]+)/i], [[o, "Netscape"], r], [/mobile vr; rv:([\w\.]+)\).+firefox/i], [r, [o, F + " Reality"]], [/ekiohf.+(flow)\/([\w\.]+)/i, /(swiftfox)/i, /(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror|klar)[\/ ]?([\w\.\+]+)/i, /(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i, /(firefox)\/([\w\.]+)/i, /(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i, /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir|obigo|mosaic|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i, /(links) \(([\w\.]+)/i, /panasonic;(viera)/i], [o, r], [/(cobalt)\/([\w\.]+)/i], [o, [r, /master.|lts./, ""]]], cpu: [[/(?:(amd|x(?:(?:86|64)[-_])?|wow|win)64)[;\)]/i], [[s, "amd64"]], [/(ia32(?=;))/i], [[s, W]], [/((?:i[346]|x)86)[;\)]/i], [[s, "ia32"]], [/\b(aarch64|arm(v?8e?l?|_?64))\b/i], [[s, "arm64"]], [/\b(arm(?:v[67])?ht?n?[fl]p?)\b/i], [[s, "armhf"]], [/windows (ce|mobile); ppc;/i], [[s, "arm"]], [/((?:ppc|powerpc)(?:64)?)(?: mac|;|\))/i], [[s, /ower/, "", W]], [/(sun4\w)[;\)]/i], [[s, "sparc"]], [/((?:avr32|ia64(?=;))|68k(?=\))|\barm(?=v(?:[1-7]|[5-7]1)l?|;|eabi)|(?=atmel )avr|(?:irix|mips|sparc)(?:64)?\b|pa-risc)/i], [[s, W]]], device: [[/\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i], [n, [q, L], [p, v]], [/\b((?:s[cgp]h|gt|sm)-\w+|sc[g-]?[\d]+a?|galaxy nexus)/i, /samsung[- ]([-\w]+)/i, /sec-(sgh\w+)/i], [n, [q, L], [p, u]], [/(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i], [n, [q, A], [p, u]], [/\((ipad);[-\w\),; ]+apple/i, /applecoremedia\/[\w\.]+ \((ipad)/i, /\b(ipad)\d\d?,\d\d?[;\]].+ios/i], [n, [q, A], [p, v]], [/(macintosh);/i], [n, [q, A]], [/\b(sh-?[altvz]?\d\d[a-ekm]?)/i], [n, [q, M], [p, u]], [/\b((?:ag[rs][23]?|bah2?|sht?|btv)-a?[lw]\d{2})\b(?!.+d\/s)/i], [n, [q, H], [p, v]], [/(?:huawei|honor)([-\w ]+)[;\)]/i, /\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i], [n, [q, H], [p, u]], [/\b(poco[\w ]+)(?: bui|\))/i, /\b; (\w+) build\/hm\1/i, /\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i, /\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i, /\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite)?)(?: bui|\))/i], [[n, /_/g, " "], [q, O], [p, u]], [/\b(mi[-_ ]?(?:pad)(?:[\w_ ]+))(?: bui|\))/i], [[n, /_/g, " "], [q, O], [p, v]], [/; (\w+) bui.+ oppo/i, /\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i], [n, [q, "OPPO"], [p, u]], [/vivo (\w+)(?: bui|\))/i, /\b(v[12]\d{3}\w?[at])(?: bui|;)/i], [n, [q, "Vivo"], [p, u]], [/\b(rmx[12]\d{3})(?: bui|;|\))/i], [n, [q, "Realme"], [p, u]], [/\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i, /\bmot(?:orola)?[- ](\w*)/i, /((?:moto[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i], [n, [q, J], [p, u]], [/\b(mz60\d|xoom[2 ]{0,2}) build\//i], [n, [q, J], [p, v]], [/((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i], [n, [q, "LG"], [p, v]], [/(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i, /\blg[-e;\/ ]+((?!browser|netcast|android tv)\w+)/i, /\blg-?([\d\w]+) bui/i], [n, [q, "LG"], [p, u]], [/(ideatab[-\w ]+)/i, /lenovo ?(s[56]000[-\w]+|tab(?:[\w ]+)|yt[-\d\w]{6}|tb[-\d\w]{6})/i], [n, [q, "Lenovo"], [p, v]], [/(?:maemo|nokia).*(n900|lumia \d+)/i, /nokia[-_ ]?([-\w\.]*)/i], [[n, /_/g, " "], [q, "Nokia"], [p, u]], [/(pixel c)\b/i], [n, [q, G], [p, v]], [/droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i], [n, [q, G], [p, u]], [/droid.+ (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i], [n, [q, N], [p, u]], [/sony tablet [ps]/i, /\b(?:sony)?sgp\w+(?: bui|\))/i], [[n, "Xperia Tablet"], [q, N], [p, v]], [/ (kb2005|in20[12]5|be20[12][59])\b/i, /(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i], [n, [q, "OnePlus"], [p, u]], [/(alexa)webm/i, /(kf[a-z]{2}wi|aeo[c-r]{2})( bui|\))/i, /(kf[a-z]+)( bui|\)).+silk\//i], [n, [q, z], [p, v]], [/((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i], [[n, /(.+)/g, "Fire Phone $1"], [q, z], [p, u]], [/(playbook);[-\w\),; ]+(rim)/i], [n, q, [p, v]], [/\b((?:bb[a-f]|st[hv])100-\d)/i, /\(bb10; (\w+)/i], [n, [q, C], [p, u]], [/(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i], [n, [q, B], [p, v]], [/ (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i], [n, [q, B], [p, u]], [/(nexus 9)/i], [n, [q, "HTC"], [p, v]], [/(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i, /(zte)[- ]([\w ]+?)(?: bui|\/|\))/i, /(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i], [q, [n, /_/g, " "], [p, u]], [/droid.+; ([ab][1-7]-?[0178a]\d\d?)/i], [n, [q, "Acer"], [p, v]], [/droid.+; (m[1-5] note) bui/i, /\bmz-([-\w]{2,})/i], [n, [q, "Meizu"], [p, u]], [/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[-_ ]?([-\w]*)/i, /(hp) ([\w ]+\w)/i, /(asus)-?(\w+)/i, /(microsoft); (lumia[\w ]+)/i, /(lenovo)[-_ ]?([-\w]+)/i, /(jolla)/i, /(oppo) ?([\w ]+) bui/i], [q, n, [p, u]], [/(kobo)\s(ereader|touch)/i, /(archos) (gamepad2?)/i, /(hp).+(touchpad(?!.+tablet)|tablet)/i, /(kindle)\/([\w\.]+)/i, /(nook)[\w ]+build\/(\w+)/i, /(dell) (strea[kpr\d ]*[\dko])/i, /(le[- ]+pan)[- ]+(\w{1,9}) bui/i, /(trinity)[- ]*(t\d{3}) bui/i, /(gigaset)[- ]+(q\w{1,9}) bui/i, /(vodafone) ([\w ]+)(?:\)| bui)/i], [q, n, [p, v]], [/(surface duo)/i], [n, [q, I], [p, v]], [/droid [\d\.]+; (fp\du?)(?: b|\))/i], [n, [q, "Fairphone"], [p, u]], [/(u304aa)/i], [n, [q, "AT&T"], [p, u]], [/\bsie-(\w*)/i], [n, [q, "Siemens"], [p, u]], [/\b(rct\w+) b/i], [n, [q, "RCA"], [p, v]], [/\b(venue[\d ]{2,7}) b/i], [n, [q, "Dell"], [p, v]], [/\b(q(?:mv|ta)\w+) b/i], [n, [q, "Verizon"], [p, v]], [/\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i], [n, [q, "Barnes & Noble"], [p, v]], [/\b(tm\d{3}\w+) b/i], [n, [q, "NuVision"], [p, v]], [/\b(k88) b/i], [n, [q, "ZTE"], [p, v]], [/\b(nx\d{3}j) b/i], [n, [q, "ZTE"], [p, u]], [/\b(gen\d{3}) b.+49h/i], [n, [q, "Swiss"], [p, u]], [/\b(zur\d{3}) b/i], [n, [q, "Swiss"], [p, v]], [/\b((zeki)?tb.*\b) b/i], [n, [q, "Zeki"], [p, v]], [/\b([yr]\d{2}) b/i, /\b(dragon[- ]+touch |dt)(\w{5}) b/i], [[q, "Dragon Touch"], n, [p, v]], [/\b(ns-?\w{0,9}) b/i], [n, [q, "Insignia"], [p, v]], [/\b((nxa|next)-?\w{0,9}) b/i], [n, [q, "NextBook"], [p, v]], [/\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i], [[q, "Voice"], n, [p, u]], [/\b(lvtel\-)?(v1[12]) b/i], [[q, "LvTel"], n, [p, u]], [/\b(ph-1) /i], [n, [q, "Essential"], [p, u]], [/\b(v(100md|700na|7011|917g).*\b) b/i], [n, [q, "Envizen"], [p, v]], [/\b(trio[-\w\. ]+) b/i], [n, [q, "MachSpeed"], [p, v]], [/\btu_(1491) b/i], [n, [q, "Rotor"], [p, v]], [/(shield[\w ]+) b/i], [n, [q, "Nvidia"], [p, v]], [/(sprint) (\w+)/i], [q, n, [p, u]], [/(kin\.[onetw]{3})/i], [[n, /\./g, " "], [q, I], [p, u]], [/droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i], [n, [q, P], [p, v]], [/droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i], [n, [q, P], [p, u]], [/smart-tv.+(samsung)/i], [q, [p, w]], [/hbbtv.+maple;(\d+)/i], [[n, /^/, "SmartTV"], [q, L], [p, w]], [/(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i], [[q, "LG"], [p, w]], [/(apple) ?tv/i], [q, [n, A + " TV"], [p, w]], [/crkey/i], [[n, E + "cast"], [q, G], [p, w]], [/droid.+aft(\w)( bui|\))/i], [n, [q, z], [p, w]], [/\(dtv[\);].+(aquos)/i, /(aquos-tv[\w ]+)\)/i], [n, [q, M], [p, w]], [/(bravia[\w ]+)( bui|\))/i], [n, [q, N], [p, w]], [/(mitv-\w{5}) bui/i], [n, [q, O], [p, w]], [/Hbbtv.*(technisat) (.*);/i], [q, n, [p, w]], [/\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i, /hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i], [[q, X], [n, X], [p, w]], [/\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i], [[p, w]], [/(ouya)/i, /(nintendo) ([wids3utch]+)/i], [q, n, [p, t]], [/droid.+; (shield) bui/i], [n, [q, "Nvidia"], [p, t]], [/(playstation [345portablevi]+)/i], [n, [q, N], [p, t]], [/\b(xbox(?: one)?(?!; xbox))[\); ]/i], [n, [q, I], [p, t]], [/((pebble))app/i], [q, n, [p, x]], [/(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i], [n, [q, A], [p, x]], [/droid.+; (glass) \d/i], [n, [q, G], [p, x]], [/droid.+; (wt63?0{2,3})\)/i], [n, [q, P], [p, x]], [/(quest( 2| pro)?)/i], [n, [q, Q], [p, x]], [/(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i], [q, [p, y]], [/(aeobc)\b/i], [n, [q, z], [p, y]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+? mobile safari/i], [n, [p, u]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i], [n, [p, v]], [/\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i], [[p, v]], [/(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i], [[p, u]], [/(android[-\w\. ]{0,9});.+buil/i], [n, [q, "Generic"]]], engine: [[/windows.+ edge\/([\w\.]+)/i], [r, [o, "EdgeHTML"]], [/webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i], [r, [o, "Blink"]], [/(presto)\/([\w\.]+)/i, /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i, /ekioh(flow)\/([\w\.]+)/i, /(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i, /(icab)[\/ ]([23]\.[\d\.]+)/i, /\b(libweb)/i], [o, r], [/rv\:([\w\.]{1,9})\b.+(gecko)/i], [r, o]], os: [[/microsoft (windows) (vista|xp)/i], [o, r], [/(windows) nt 6\.2; (arm)/i, /(windows (?:phone(?: os)?|mobile))[\/ ]?([\d\.\w ]*)/i, /(windows)[\/ ]?([ntce\d\. ]+\w)(?!.+xbox)/i], [o, [r, Z, $]], [/(win(?=3|9|n)|win 9x )([nt\d\.]+)/i], [[o, "Windows"], [r, Z, $]], [/ip[honead]{2,4}\b(?:.*os ([\w]+) like mac|; opera)/i, /ios;fbsv\/([\d\.]+)/i, /cfnetwork\/.+darwin/i], [[r, /_/g, "."], [o, "iOS"]], [/(mac os x) ?([\w\. ]*)/i, /(macintosh|mac_powerpc\b)(?!.+haiku)/i], [[o, S], [r, /_/g, "."]], [/droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i], [r, o], [/(android|webos|qnx|bada|rim tablet os|maemo|meego|sailfish)[-\/ ]?([\w\.]*)/i, /(blackberry)\w*\/([\w\.]*)/i, /(tizen|kaios)[\/ ]([\w\.]+)/i, /\((series40);/i], [o, r], [/\(bb(10);/i], [r, [o, C]], [/(?:symbian ?os|symbos|s60(?=;)|series60)[-\/ ]?([\w\.]*)/i], [r, [o, "Symbian"]], [/mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i], [r, [o, F + " OS"]], [/web0s;.+rt(tv)/i, /\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i], [r, [o, "webOS"]], [/watch(?: ?os[,\/]|\d,\d\/)([\d\.]+)/i], [r, [o, "watchOS"]], [/crkey\/([\d\.]+)/i], [r, [o, E + "cast"]], [/(cros) [\w]+(?:\)| ([\w\.]+)\b)/i], [[o, R], r], [/panasonic;(viera)/i, /(netrange)mmh/i, /(nettv)\/(\d+\.[\w\.]+)/i, /(nintendo|playstation) ([wids345portablevuch]+)/i, /(xbox); +xbox ([^\);]+)/i, /\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i, /(mint)[\/\(\) ]?(\w*)/i, /(mageia|vectorlinux)[; ]/i, /([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i, /(hurd|linux) ?([\w\.]*)/i, /(gnu) ?([\w\.]*)/i, /\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i, /(haiku) (\w+)/i], [o, r], [/(sunos) ?([\w\.\d]*)/i], [[o, "Solaris"], r], [/((?:open)?solaris)[-\/ ]?([\w\.]*)/i, /(aix) ((\d)(?=\.|\)| )[\w\.])*/i, /\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux|serenityos)/i, /(unix) ?([\w\.]*)/i], [o, r]] }, aa = function(a2, b2) {
            if (typeof a2 === k && (b2 = a2, a2 = void 0), !(this instanceof aa)) return new aa(a2, b2).getResult();
            var c2 = typeof g2 !== j && g2.navigator ? g2.navigator : void 0, d2 = a2 || (c2 && c2.userAgent ? c2.userAgent : ""), e3 = c2 && c2.userAgentData ? c2.userAgentData : void 0, f3 = b2 ? T(_, b2) : _, h2 = c2 && c2.userAgent == d2;
            return this.getBrowser = function() {
              var a3, b3 = {};
              return b3[o] = void 0, b3[r] = void 0, Y.call(b3, d2, f3.browser), b3[m] = typeof (a3 = b3[r]) === l ? a3.replace(/[^\d\.]/g, "").split(".")[0] : void 0, h2 && c2 && c2.brave && typeof c2.brave.isBrave == i && (b3[o] = "Brave"), b3;
            }, this.getCPU = function() {
              var a3 = {};
              return a3[s] = void 0, Y.call(a3, d2, f3.cpu), a3;
            }, this.getDevice = function() {
              var a3 = {};
              return a3[q] = void 0, a3[n] = void 0, a3[p] = void 0, Y.call(a3, d2, f3.device), h2 && !a3[p] && e3 && e3.mobile && (a3[p] = u), h2 && "Macintosh" == a3[n] && c2 && typeof c2.standalone !== j && c2.maxTouchPoints && c2.maxTouchPoints > 2 && (a3[n] = "iPad", a3[p] = v), a3;
            }, this.getEngine = function() {
              var a3 = {};
              return a3[o] = void 0, a3[r] = void 0, Y.call(a3, d2, f3.engine), a3;
            }, this.getOS = function() {
              var a3 = {};
              return a3[o] = void 0, a3[r] = void 0, Y.call(a3, d2, f3.os), h2 && !a3[o] && e3 && "Unknown" != e3.platform && (a3[o] = e3.platform.replace(/chrome os/i, R).replace(/macos/i, S)), a3;
            }, this.getResult = function() {
              return { ua: this.getUA(), browser: this.getBrowser(), engine: this.getEngine(), os: this.getOS(), device: this.getDevice(), cpu: this.getCPU() };
            }, this.getUA = function() {
              return d2;
            }, this.setUA = function(a3) {
              return d2 = typeof a3 === l && a3.length > 350 ? X(a3, 350) : a3, this;
            }, this.setUA(d2), this;
          };
          aa.VERSION = "1.0.35", aa.BROWSER = U([o, r, m]), aa.CPU = U([s]), aa.DEVICE = U([n, q, p, t, u, w, v, x, y]), aa.ENGINE = aa.OS = U([o, r]), typeof f2 !== j ? (e2.exports && (f2 = e2.exports = aa), f2.UAParser = aa) : c.amdO ? void 0 === (d = function() {
            return aa;
          }.call(b, c, b, a)) || (a.exports = d) : typeof g2 !== j && (g2.UAParser = aa);
          var ab = typeof g2 !== j && (g2.jQuery || g2.Zepto);
          if (ab && !ab.ua) {
            var ac = new aa();
            ab.ua = ac.getResult(), ab.ua.get = function() {
              return ac.getUA();
            }, ab.ua.set = function(a2) {
              ac.setUA(a2);
              var b2 = ac.getResult();
              for (var c2 in b2) ab.ua[c2] = b2[c2];
            };
          }
        }("object" == typeof window ? window : this);
      } }, f = {};
      function g(a2) {
        var b2 = f[a2];
        if (void 0 !== b2) return b2.exports;
        var c2 = f[a2] = { exports: {} }, d2 = true;
        try {
          e[a2].call(c2.exports, c2, c2.exports, g), d2 = false;
        } finally {
          d2 && delete f[a2];
        }
        return c2.exports;
      }
      g.ab = "//", a.exports = g(226);
    }, 850: (a) => {
      (() => {
        "use strict";
        var b = { 993: (a2) => {
          var b2 = Object.prototype.hasOwnProperty, c2 = "~";
          function d2() {
          }
          function e2(a3, b3, c3) {
            this.fn = a3, this.context = b3, this.once = c3 || false;
          }
          function f(a3, b3, d3, f2, g2) {
            if ("function" != typeof d3) throw TypeError("The listener must be a function");
            var h2 = new e2(d3, f2 || a3, g2), i = c2 ? c2 + b3 : b3;
            return a3._events[i] ? a3._events[i].fn ? a3._events[i] = [a3._events[i], h2] : a3._events[i].push(h2) : (a3._events[i] = h2, a3._eventsCount++), a3;
          }
          function g(a3, b3) {
            0 == --a3._eventsCount ? a3._events = new d2() : delete a3._events[b3];
          }
          function h() {
            this._events = new d2(), this._eventsCount = 0;
          }
          Object.create && (d2.prototype = /* @__PURE__ */ Object.create(null), new d2().__proto__ || (c2 = false)), h.prototype.eventNames = function() {
            var a3, d3, e3 = [];
            if (0 === this._eventsCount) return e3;
            for (d3 in a3 = this._events) b2.call(a3, d3) && e3.push(c2 ? d3.slice(1) : d3);
            return Object.getOwnPropertySymbols ? e3.concat(Object.getOwnPropertySymbols(a3)) : e3;
          }, h.prototype.listeners = function(a3) {
            var b3 = c2 ? c2 + a3 : a3, d3 = this._events[b3];
            if (!d3) return [];
            if (d3.fn) return [d3.fn];
            for (var e3 = 0, f2 = d3.length, g2 = Array(f2); e3 < f2; e3++) g2[e3] = d3[e3].fn;
            return g2;
          }, h.prototype.listenerCount = function(a3) {
            var b3 = c2 ? c2 + a3 : a3, d3 = this._events[b3];
            return d3 ? d3.fn ? 1 : d3.length : 0;
          }, h.prototype.emit = function(a3, b3, d3, e3, f2, g2) {
            var h2 = c2 ? c2 + a3 : a3;
            if (!this._events[h2]) return false;
            var i, j, k = this._events[h2], l = arguments.length;
            if (k.fn) {
              switch (k.once && this.removeListener(a3, k.fn, void 0, true), l) {
                case 1:
                  return k.fn.call(k.context), true;
                case 2:
                  return k.fn.call(k.context, b3), true;
                case 3:
                  return k.fn.call(k.context, b3, d3), true;
                case 4:
                  return k.fn.call(k.context, b3, d3, e3), true;
                case 5:
                  return k.fn.call(k.context, b3, d3, e3, f2), true;
                case 6:
                  return k.fn.call(k.context, b3, d3, e3, f2, g2), true;
              }
              for (j = 1, i = Array(l - 1); j < l; j++) i[j - 1] = arguments[j];
              k.fn.apply(k.context, i);
            } else {
              var m, n = k.length;
              for (j = 0; j < n; j++) switch (k[j].once && this.removeListener(a3, k[j].fn, void 0, true), l) {
                case 1:
                  k[j].fn.call(k[j].context);
                  break;
                case 2:
                  k[j].fn.call(k[j].context, b3);
                  break;
                case 3:
                  k[j].fn.call(k[j].context, b3, d3);
                  break;
                case 4:
                  k[j].fn.call(k[j].context, b3, d3, e3);
                  break;
                default:
                  if (!i) for (m = 1, i = Array(l - 1); m < l; m++) i[m - 1] = arguments[m];
                  k[j].fn.apply(k[j].context, i);
              }
            }
            return true;
          }, h.prototype.on = function(a3, b3, c3) {
            return f(this, a3, b3, c3, false);
          }, h.prototype.once = function(a3, b3, c3) {
            return f(this, a3, b3, c3, true);
          }, h.prototype.removeListener = function(a3, b3, d3, e3) {
            var f2 = c2 ? c2 + a3 : a3;
            if (!this._events[f2]) return this;
            if (!b3) return g(this, f2), this;
            var h2 = this._events[f2];
            if (h2.fn) h2.fn !== b3 || e3 && !h2.once || d3 && h2.context !== d3 || g(this, f2);
            else {
              for (var i = 0, j = [], k = h2.length; i < k; i++) (h2[i].fn !== b3 || e3 && !h2[i].once || d3 && h2[i].context !== d3) && j.push(h2[i]);
              j.length ? this._events[f2] = 1 === j.length ? j[0] : j : g(this, f2);
            }
            return this;
          }, h.prototype.removeAllListeners = function(a3) {
            var b3;
            return a3 ? (b3 = c2 ? c2 + a3 : a3, this._events[b3] && g(this, b3)) : (this._events = new d2(), this._eventsCount = 0), this;
          }, h.prototype.off = h.prototype.removeListener, h.prototype.addListener = h.prototype.on, h.prefixed = c2, h.EventEmitter = h, a2.exports = h;
        }, 213: (a2) => {
          a2.exports = (a3, b2) => (b2 = b2 || (() => {
          }), a3.then((a4) => new Promise((a5) => {
            a5(b2());
          }).then(() => a4), (a4) => new Promise((a5) => {
            a5(b2());
          }).then(() => {
            throw a4;
          })));
        }, 574: (a2, b2) => {
          Object.defineProperty(b2, "__esModule", { value: true }), b2.default = function(a3, b3, c2) {
            let d2 = 0, e2 = a3.length;
            for (; e2 > 0; ) {
              let f = e2 / 2 | 0, g = d2 + f;
              0 >= c2(a3[g], b3) ? (d2 = ++g, e2 -= f + 1) : e2 = f;
            }
            return d2;
          };
        }, 821: (a2, b2, c2) => {
          Object.defineProperty(b2, "__esModule", { value: true });
          let d2 = c2(574);
          class e2 {
            constructor() {
              this._queue = [];
            }
            enqueue(a3, b3) {
              let c3 = { priority: (b3 = Object.assign({ priority: 0 }, b3)).priority, run: a3 };
              if (this.size && this._queue[this.size - 1].priority >= b3.priority) return void this._queue.push(c3);
              let e3 = d2.default(this._queue, c3, (a4, b4) => b4.priority - a4.priority);
              this._queue.splice(e3, 0, c3);
            }
            dequeue() {
              let a3 = this._queue.shift();
              return null == a3 ? void 0 : a3.run;
            }
            filter(a3) {
              return this._queue.filter((b3) => b3.priority === a3.priority).map((a4) => a4.run);
            }
            get size() {
              return this._queue.length;
            }
          }
          b2.default = e2;
        }, 816: (a2, b2, c2) => {
          let d2 = c2(213);
          class e2 extends Error {
            constructor(a3) {
              super(a3), this.name = "TimeoutError";
            }
          }
          let f = (a3, b3, c3) => new Promise((f2, g) => {
            if ("number" != typeof b3 || b3 < 0) throw TypeError("Expected `milliseconds` to be a positive number");
            if (b3 === 1 / 0) return void f2(a3);
            let h = setTimeout(() => {
              if ("function" == typeof c3) {
                try {
                  f2(c3());
                } catch (a4) {
                  g(a4);
                }
                return;
              }
              let d3 = "string" == typeof c3 ? c3 : `Promise timed out after ${b3} milliseconds`, h2 = c3 instanceof Error ? c3 : new e2(d3);
              "function" == typeof a3.cancel && a3.cancel(), g(h2);
            }, b3);
            d2(a3.then(f2, g), () => {
              clearTimeout(h);
            });
          });
          a2.exports = f, a2.exports.default = f, a2.exports.TimeoutError = e2;
        } }, c = {};
        function d(a2) {
          var e2 = c[a2];
          if (void 0 !== e2) return e2.exports;
          var f = c[a2] = { exports: {} }, g = true;
          try {
            b[a2](f, f.exports, d), g = false;
          } finally {
            g && delete c[a2];
          }
          return f.exports;
        }
        d.ab = "//";
        var e = {};
        (() => {
          Object.defineProperty(e, "__esModule", { value: true });
          let a2 = d(993), b2 = d(816), c2 = d(821), f = () => {
          }, g = new b2.TimeoutError();
          class h extends a2 {
            constructor(a3) {
              var b3, d2, e2, g2;
              if (super(), this._intervalCount = 0, this._intervalEnd = 0, this._pendingCount = 0, this._resolveEmpty = f, this._resolveIdle = f, !("number" == typeof (a3 = Object.assign({ carryoverConcurrencyCount: false, intervalCap: 1 / 0, interval: 0, concurrency: 1 / 0, autoStart: true, queueClass: c2.default }, a3)).intervalCap && a3.intervalCap >= 1)) throw TypeError(`Expected \`intervalCap\` to be a number from 1 and up, got \`${null != (d2 = null == (b3 = a3.intervalCap) ? void 0 : b3.toString()) ? d2 : ""}\` (${typeof a3.intervalCap})`);
              if (void 0 === a3.interval || !(Number.isFinite(a3.interval) && a3.interval >= 0)) throw TypeError(`Expected \`interval\` to be a finite number >= 0, got \`${null != (g2 = null == (e2 = a3.interval) ? void 0 : e2.toString()) ? g2 : ""}\` (${typeof a3.interval})`);
              this._carryoverConcurrencyCount = a3.carryoverConcurrencyCount, this._isIntervalIgnored = a3.intervalCap === 1 / 0 || 0 === a3.interval, this._intervalCap = a3.intervalCap, this._interval = a3.interval, this._queue = new a3.queueClass(), this._queueClass = a3.queueClass, this.concurrency = a3.concurrency, this._timeout = a3.timeout, this._throwOnTimeout = true === a3.throwOnTimeout, this._isPaused = false === a3.autoStart;
            }
            get _doesIntervalAllowAnother() {
              return this._isIntervalIgnored || this._intervalCount < this._intervalCap;
            }
            get _doesConcurrentAllowAnother() {
              return this._pendingCount < this._concurrency;
            }
            _next() {
              this._pendingCount--, this._tryToStartAnother(), this.emit("next");
            }
            _resolvePromises() {
              this._resolveEmpty(), this._resolveEmpty = f, 0 === this._pendingCount && (this._resolveIdle(), this._resolveIdle = f, this.emit("idle"));
            }
            _onResumeInterval() {
              this._onInterval(), this._initializeIntervalIfNeeded(), this._timeoutId = void 0;
            }
            _isIntervalPaused() {
              let a3 = Date.now();
              if (void 0 === this._intervalId) {
                let b3 = this._intervalEnd - a3;
                if (!(b3 < 0)) return void 0 === this._timeoutId && (this._timeoutId = setTimeout(() => {
                  this._onResumeInterval();
                }, b3)), true;
                this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0;
              }
              return false;
            }
            _tryToStartAnother() {
              if (0 === this._queue.size) return this._intervalId && clearInterval(this._intervalId), this._intervalId = void 0, this._resolvePromises(), false;
              if (!this._isPaused) {
                let a3 = !this._isIntervalPaused();
                if (this._doesIntervalAllowAnother && this._doesConcurrentAllowAnother) {
                  let b3 = this._queue.dequeue();
                  return !!b3 && (this.emit("active"), b3(), a3 && this._initializeIntervalIfNeeded(), true);
                }
              }
              return false;
            }
            _initializeIntervalIfNeeded() {
              this._isIntervalIgnored || void 0 !== this._intervalId || (this._intervalId = setInterval(() => {
                this._onInterval();
              }, this._interval), this._intervalEnd = Date.now() + this._interval);
            }
            _onInterval() {
              0 === this._intervalCount && 0 === this._pendingCount && this._intervalId && (clearInterval(this._intervalId), this._intervalId = void 0), this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0, this._processQueue();
            }
            _processQueue() {
              for (; this._tryToStartAnother(); ) ;
            }
            get concurrency() {
              return this._concurrency;
            }
            set concurrency(a3) {
              if (!("number" == typeof a3 && a3 >= 1)) throw TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${a3}\` (${typeof a3})`);
              this._concurrency = a3, this._processQueue();
            }
            async add(a3, c3 = {}) {
              return new Promise((d2, e2) => {
                let f2 = async () => {
                  this._pendingCount++, this._intervalCount++;
                  try {
                    let f3 = void 0 === this._timeout && void 0 === c3.timeout ? a3() : b2.default(Promise.resolve(a3()), void 0 === c3.timeout ? this._timeout : c3.timeout, () => {
                      (void 0 === c3.throwOnTimeout ? this._throwOnTimeout : c3.throwOnTimeout) && e2(g);
                    });
                    d2(await f3);
                  } catch (a4) {
                    e2(a4);
                  }
                  this._next();
                };
                this._queue.enqueue(f2, c3), this._tryToStartAnother(), this.emit("add");
              });
            }
            async addAll(a3, b3) {
              return Promise.all(a3.map(async (a4) => this.add(a4, b3)));
            }
            start() {
              return this._isPaused && (this._isPaused = false, this._processQueue()), this;
            }
            pause() {
              this._isPaused = true;
            }
            clear() {
              this._queue = new this._queueClass();
            }
            async onEmpty() {
              if (0 !== this._queue.size) return new Promise((a3) => {
                let b3 = this._resolveEmpty;
                this._resolveEmpty = () => {
                  b3(), a3();
                };
              });
            }
            async onIdle() {
              if (0 !== this._pendingCount || 0 !== this._queue.size) return new Promise((a3) => {
                let b3 = this._resolveIdle;
                this._resolveIdle = () => {
                  b3(), a3();
                };
              });
            }
            get size() {
              return this._queue.size;
            }
            sizeBy(a3) {
              return this._queue.filter(a3).length;
            }
            get pending() {
              return this._pendingCount;
            }
            get isPaused() {
              return this._isPaused;
            }
            get timeout() {
              return this._timeout;
            }
            set timeout(a3) {
              this._timeout = a3;
            }
          }
          e.default = h;
        })(), a.exports = e;
      })();
    }, 879: (a, b, c) => {
      "use strict";
      a.exports = c(587);
    } }, (a) => {
      var b = a(a.s = 57);
      (_ENTRIES = "u" < typeof _ENTRIES ? {} : _ENTRIES)["middleware_src/middleware"] = b;
    }]);
  }
});

// ../../node_modules/@opennextjs/aws/dist/core/edgeFunctionHandler.js
var edgeFunctionHandler_exports = {};
__export(edgeFunctionHandler_exports, {
  default: () => edgeFunctionHandler
});
async function edgeFunctionHandler(request) {
  const path3 = new URL(request.url).pathname;
  const routes = globalThis._ROUTES;
  const correspondingRoute = routes.find((route) => route.regex.some((r) => new RegExp(r).test(path3)));
  if (!correspondingRoute) {
    throw new Error(`No route found for ${request.url}`);
  }
  const entry = await self._ENTRIES[`middleware_${correspondingRoute.name}`];
  const result = await entry.default({
    page: correspondingRoute.page,
    request: {
      ...request,
      page: {
        name: correspondingRoute.name
      }
    }
  });
  globalThis.__openNextAls.getStore()?.pendingPromiseRunner.add(result.waitUntil);
  const response = result.response;
  return response;
}
var init_edgeFunctionHandler = __esm({
  "../../node_modules/@opennextjs/aws/dist/core/edgeFunctionHandler.js"() {
    globalThis._ENTRIES = {};
    globalThis.self = globalThis;
    globalThis._ROUTES = [{ "name": "src/middleware", "page": "/", "regex": ["^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/admin(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$"] }];
    require_edge_runtime_webpack();
    require_middleware();
  }
});

// ../../node_modules/@opennextjs/aws/dist/utils/promise.js
init_logger();
var DetachedPromise = class {
  resolve;
  reject;
  promise;
  constructor() {
    let resolve;
    let reject;
    this.promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.resolve = resolve;
    this.reject = reject;
  }
};
var DetachedPromiseRunner = class {
  promises = [];
  withResolvers() {
    const detachedPromise = new DetachedPromise();
    this.promises.push(detachedPromise);
    return detachedPromise;
  }
  add(promise) {
    const detachedPromise = new DetachedPromise();
    this.promises.push(detachedPromise);
    promise.then(detachedPromise.resolve, detachedPromise.reject);
  }
  async await() {
    debug(`Awaiting ${this.promises.length} detached promises`);
    const results = await Promise.allSettled(this.promises.map((p) => p.promise));
    const rejectedPromises = results.filter((r) => r.status === "rejected");
    rejectedPromises.forEach((r) => {
      error(r.reason);
    });
  }
};
async function awaitAllDetachedPromise() {
  const store = globalThis.__openNextAls.getStore();
  const promisesToAwait = store?.pendingPromiseRunner.await() ?? Promise.resolve();
  if (store?.waitUntil) {
    store.waitUntil(promisesToAwait);
    return;
  }
  await promisesToAwait;
}
function provideNextAfterProvider() {
  const NEXT_REQUEST_CONTEXT_SYMBOL = Symbol.for("@next/request-context");
  const VERCEL_REQUEST_CONTEXT_SYMBOL = Symbol.for("@vercel/request-context");
  const store = globalThis.__openNextAls.getStore();
  const waitUntil = store?.waitUntil ?? ((promise) => store?.pendingPromiseRunner.add(promise));
  const nextAfterContext = {
    get: () => ({
      waitUntil
    })
  };
  globalThis[NEXT_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  if (process.env.EMULATE_VERCEL_REQUEST_CONTEXT) {
    globalThis[VERCEL_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  }
}
function runWithOpenNextRequestContext({ isISRRevalidation, waitUntil, requestId = Math.random().toString(36) }, fn) {
  return globalThis.__openNextAls.run({
    requestId,
    pendingPromiseRunner: new DetachedPromiseRunner(),
    isISRRevalidation,
    waitUntil,
    writtenTags: /* @__PURE__ */ new Set()
  }, async () => {
    provideNextAfterProvider();
    let result;
    try {
      result = await fn();
    } finally {
      await awaitAllDetachedPromise();
    }
    return result;
  });
}

// ../../node_modules/@opennextjs/aws/dist/adapters/middleware.js
init_logger();

// ../../node_modules/@opennextjs/aws/dist/core/createGenericHandler.js
init_logger();

// ../../node_modules/@opennextjs/aws/dist/core/resolve.js
async function resolveConverter(converter2) {
  if (typeof converter2 === "function") {
    return converter2();
  }
  const m_1 = await Promise.resolve().then(() => (init_edge(), edge_exports));
  return m_1.default;
}
async function resolveWrapper(wrapper) {
  if (typeof wrapper === "function") {
    return wrapper();
  }
  const m_1 = await Promise.resolve().then(() => (init_cloudflare_edge(), cloudflare_edge_exports));
  return m_1.default;
}
async function resolveOriginResolver(originResolver) {
  if (typeof originResolver === "function") {
    return originResolver();
  }
  const m_1 = await Promise.resolve().then(() => (init_pattern_env(), pattern_env_exports));
  return m_1.default;
}
async function resolveAssetResolver(assetResolver) {
  if (typeof assetResolver === "function") {
    return assetResolver();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy(), dummy_exports));
  return m_1.default;
}
async function resolveProxyRequest(proxyRequest) {
  if (typeof proxyRequest === "function") {
    return proxyRequest();
  }
  const m_1 = await Promise.resolve().then(() => (init_fetch(), fetch_exports));
  return m_1.default;
}

// ../../node_modules/@opennextjs/aws/dist/core/createGenericHandler.js
async function createGenericHandler(handler3) {
  const config = await import("./open-next.config.mjs").then((m) => m.default);
  globalThis.openNextConfig = config;
  const handlerConfig = config[handler3.type];
  const override = handlerConfig && "override" in handlerConfig ? handlerConfig.override : void 0;
  const converter2 = await resolveConverter(override?.converter);
  const { name, wrapper } = await resolveWrapper(override?.wrapper);
  debug("Using wrapper", name);
  return wrapper(handler3.handler, converter2);
}

// ../../node_modules/@opennextjs/aws/dist/core/routing/util.js
import crypto2 from "node:crypto";
import { parse as parseQs, stringify as stringifyQs } from "node:querystring";

// ../../node_modules/@opennextjs/aws/dist/adapters/config/index.js
init_logger();
import path from "node:path";
globalThis.__dirname ??= "";
var NEXT_DIR = path.join(__dirname, ".next");
var OPEN_NEXT_DIR = path.join(__dirname, ".open-next");
debug({ NEXT_DIR, OPEN_NEXT_DIR });
var NextConfig = { "env": {}, "webpack": null, "typescript": { "ignoreBuildErrors": false }, "typedRoutes": false, "distDir": ".next", "cleanDistDir": true, "assetPrefix": "", "cacheMaxMemorySize": 52428800, "configOrigin": "next.config.mjs", "useFileSystemPublicRoutes": true, "generateEtags": true, "pageExtensions": ["tsx", "ts", "jsx", "js"], "poweredByHeader": true, "compress": true, "images": { "deviceSizes": [640, 750, 828, 1080, 1200, 1920, 2048, 3840], "imageSizes": [32, 48, 64, 96, 128, 256, 384], "path": "/_next/image", "loader": "default", "loaderFile": "", "domains": [], "disableStaticImages": false, "minimumCacheTTL": 14400, "formats": ["image/webp"], "maximumRedirects": 3, "maximumResponseBody": 5e7, "dangerouslyAllowLocalIP": false, "dangerouslyAllowSVG": false, "contentSecurityPolicy": "script-src 'none'; frame-src 'none'; sandbox;", "contentDispositionType": "attachment", "localPatterns": [{ "pathname": "**", "search": "" }], "remotePatterns": [{ "protocol": "https", "hostname": "images.unsplash.com", "pathname": "/**" }, { "protocol": "https", "hostname": "plus.unsplash.com", "pathname": "/**" }, { "protocol": "https", "hostname": "barahonda.com", "pathname": "/**" }], "qualities": [75], "unoptimized": false }, "devIndicators": { "position": "bottom-left" }, "onDemandEntries": { "maxInactiveAge": 6e4, "pagesBufferLength": 5 }, "basePath": "", "sassOptions": {}, "trailingSlash": false, "i18n": null, "productionBrowserSourceMaps": false, "excludeDefaultMomentLocales": true, "reactProductionProfiling": false, "reactStrictMode": null, "reactMaxHeadersLength": 6e3, "httpAgentOptions": { "keepAlive": true }, "logging": {}, "compiler": {}, "expireTime": 31536e3, "staticPageGenerationTimeout": 60, "output": "standalone", "modularizeImports": { "@mui/icons-material": { "transform": "@mui/icons-material/{{member}}" }, "lodash": { "transform": "lodash/{{member}}" } }, "outputFileTracingRoot": "C:\\Users\\User\\Documents\\1PROJEKTY\\Il Buon Caffe", "cacheComponents": false, "cacheLife": { "default": { "stale": 300, "revalidate": 900, "expire": 4294967294 }, "seconds": { "stale": 30, "revalidate": 1, "expire": 60 }, "minutes": { "stale": 300, "revalidate": 60, "expire": 3600 }, "hours": { "stale": 300, "revalidate": 3600, "expire": 86400 }, "days": { "stale": 300, "revalidate": 86400, "expire": 604800 }, "weeks": { "stale": 300, "revalidate": 604800, "expire": 2592e3 }, "max": { "stale": 300, "revalidate": 2592e3, "expire": 31536e3 } }, "cacheHandlers": {}, "experimental": { "useSkewCookie": false, "cssChunking": true, "multiZoneDraftMode": false, "appNavFailHandling": false, "prerenderEarlyExit": true, "serverMinification": true, "linkNoTouchStart": false, "caseSensitiveRoutes": false, "dynamicOnHover": false, "preloadEntriesOnStart": true, "clientRouterFilter": true, "clientRouterFilterRedirects": false, "fetchCacheKeyPrefix": "", "proxyPrefetch": "flexible", "optimisticClientCache": true, "manualClientBasePath": false, "cpus": 19, "memoryBasedWorkersCount": false, "imgOptConcurrency": null, "imgOptTimeoutInSeconds": 7, "imgOptMaxInputPixels": 268402689, "imgOptSequentialRead": null, "imgOptSkipMetadata": null, "isrFlushToDisk": true, "workerThreads": false, "optimizeCss": false, "nextScriptWorkers": false, "scrollRestoration": false, "externalDir": false, "disableOptimizedLoading": false, "gzipSize": true, "craCompat": false, "esmExternals": true, "fullySpecified": false, "swcTraceProfiling": false, "forceSwcTransforms": false, "largePageDataBytes": 128e3, "typedEnv": false, "parallelServerCompiles": false, "parallelServerBuildTraces": false, "ppr": false, "authInterrupts": false, "webpackMemoryOptimizations": false, "optimizeServerReact": true, "viewTransition": false, "removeUncaughtErrorAndRejectionListeners": false, "validateRSCRequestHeaders": false, "staleTimes": { "dynamic": 0, "static": 300 }, "reactDebugChannel": false, "serverComponentsHmrCache": true, "staticGenerationMaxConcurrency": 8, "staticGenerationMinPagesPerWorker": 25, "transitionIndicator": false, "inlineCss": false, "useCache": false, "globalNotFound": false, "browserDebugInfoInTerminal": false, "lockDistDir": true, "isolatedDevBuild": true, "proxyClientMaxBodySize": 10485760, "hideLogsAfterAbort": false, "mcpServer": true, "turbopackFileSystemCacheForDev": true, "turbopackFileSystemCacheForBuild": false, "turbopackInferModuleSideEffects": false, "optimizePackageImports": ["lucide-react", "date-fns", "lodash-es", "ramda", "antd", "react-bootstrap", "ahooks", "@ant-design/icons", "@headlessui/react", "@headlessui-float/react", "@heroicons/react/20/solid", "@heroicons/react/24/solid", "@heroicons/react/24/outline", "@visx/visx", "@tremor/react", "rxjs", "@mui/material", "@mui/icons-material", "recharts", "react-use", "effect", "@effect/schema", "@effect/platform", "@effect/platform-node", "@effect/platform-browser", "@effect/platform-bun", "@effect/sql", "@effect/sql-mssql", "@effect/sql-mysql2", "@effect/sql-pg", "@effect/sql-sqlite-node", "@effect/sql-sqlite-bun", "@effect/sql-sqlite-wasm", "@effect/sql-sqlite-react-native", "@effect/rpc", "@effect/rpc-http", "@effect/typeclass", "@effect/experimental", "@effect/opentelemetry", "@material-ui/core", "@material-ui/icons", "@tabler/icons-react", "mui-core", "react-icons/ai", "react-icons/bi", "react-icons/bs", "react-icons/cg", "react-icons/ci", "react-icons/di", "react-icons/fa", "react-icons/fa6", "react-icons/fc", "react-icons/fi", "react-icons/gi", "react-icons/go", "react-icons/gr", "react-icons/hi", "react-icons/hi2", "react-icons/im", "react-icons/io", "react-icons/io5", "react-icons/lia", "react-icons/lib", "react-icons/lu", "react-icons/md", "react-icons/pi", "react-icons/ri", "react-icons/rx", "react-icons/si", "react-icons/sl", "react-icons/tb", "react-icons/tfi", "react-icons/ti", "react-icons/vsc", "react-icons/wi"], "trustHostHeader": false, "isExperimentalCompile": false }, "htmlLimitedBots": "[\\w-]+-Google|Google-[\\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight", "bundlePagesRouterDependencies": false, "configFileName": "next.config.mjs", "turbopack": { "root": "C:\\Users\\User\\Documents\\1PROJEKTY\\Il Buon Caffe" }, "distDirRoot": ".next", "_originalRewrites": { "beforeFiles": [], "afterFiles": [{ "source": "/api/auth/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/auth/:path*" }, { "source": "/api/products/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/products/:path*" }, { "source": "/api/categories/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/categories/:path*" }, { "source": "/api/orders/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/orders/:path*" }, { "source": "/api/user/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/user/:path*" }, { "source": "/api/legal/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/legal/:path*" }, { "source": "/api/payments/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/payments/:path*" }, { "source": "/api/webhooks/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/webhooks/:path*" }, { "source": "/api/uploads/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/uploads/:path*" }, { "source": "/health", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/health" }], "fallback": [] } };
var BuildId = "AeyNuS0dPbfXEpIkaONAN";
var RoutesManifest = { "basePath": "", "rewrites": { "beforeFiles": [], "afterFiles": [{ "source": "/api/auth/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/auth/:path*", "regex": "^/api/auth(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/api/products/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/products/:path*", "regex": "^/api/products(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/api/categories/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/categories/:path*", "regex": "^/api/categories(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/api/orders/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/orders/:path*", "regex": "^/api/orders(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/api/user/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/user/:path*", "regex": "^/api/user(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/api/legal/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/legal/:path*", "regex": "^/api/legal(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/api/payments/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/payments/:path*", "regex": "^/api/payments(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/api/webhooks/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/webhooks/:path*", "regex": "^/api/webhooks(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/api/uploads/:path*", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/uploads/:path*", "regex": "^/api/uploads(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/health", "destination": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/health", "regex": "^/health(?:/)?$" }], "fallback": [] }, "redirects": [{ "source": "/:path+/", "destination": "/:path+", "internal": true, "priority": true, "statusCode": 308, "regex": "^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))/$" }], "routes": { "static": [{ "page": "/", "regex": "^/(?:/)?$", "routeKeys": {}, "namedRegex": "^/(?:/)?$" }, { "page": "/_global-error", "regex": "^/_global\\-error(?:/)?$", "routeKeys": {}, "namedRegex": "^/_global\\-error(?:/)?$" }, { "page": "/_not-found", "regex": "^/_not\\-found(?:/)?$", "routeKeys": {}, "namedRegex": "^/_not\\-found(?:/)?$" }, { "page": "/account", "regex": "^/account(?:/)?$", "routeKeys": {}, "namedRegex": "^/account(?:/)?$" }, { "page": "/account/data-export", "regex": "^/account/data\\-export(?:/)?$", "routeKeys": {}, "namedRegex": "^/account/data\\-export(?:/)?$" }, { "page": "/admin", "regex": "^/admin(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin(?:/)?$" }, { "page": "/admin/allegro", "regex": "^/admin/allegro(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/allegro(?:/)?$" }, { "page": "/admin/audit", "regex": "^/admin/audit(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/audit(?:/)?$" }, { "page": "/admin/content", "regex": "^/admin/content(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/content(?:/)?$" }, { "page": "/admin/customers", "regex": "^/admin/customers(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/customers(?:/)?$" }, { "page": "/admin/finance", "regex": "^/admin/finance(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/finance(?:/)?$" }, { "page": "/admin/login", "regex": "^/admin/login(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/login(?:/)?$" }, { "page": "/admin/marketing/promotions", "regex": "^/admin/marketing/promotions(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/marketing/promotions(?:/)?$" }, { "page": "/admin/orders", "regex": "^/admin/orders(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/orders(?:/)?$" }, { "page": "/admin/products", "regex": "^/admin/products(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/products(?:/)?$" }, { "page": "/admin/settings", "regex": "^/admin/settings(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/settings(?:/)?$" }, { "page": "/api/admin/logout", "regex": "^/api/admin/logout(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/admin/logout(?:/)?$" }, { "page": "/auth", "regex": "^/auth(?:/)?$", "routeKeys": {}, "namedRegex": "^/auth(?:/)?$" }, { "page": "/checkout", "regex": "^/checkout(?:/)?$", "routeKeys": {}, "namedRegex": "^/checkout(?:/)?$" }, { "page": "/checkout/payment", "regex": "^/checkout/payment(?:/)?$", "routeKeys": {}, "namedRegex": "^/checkout/payment(?:/)?$" }, { "page": "/encyklopedia", "regex": "^/encyklopedia(?:/)?$", "routeKeys": {}, "namedRegex": "^/encyklopedia(?:/)?$" }, { "page": "/encyklopedia/wino", "regex": "^/encyklopedia/wino(?:/)?$", "routeKeys": {}, "namedRegex": "^/encyklopedia/wino(?:/)?$" }, { "page": "/encyklopedia/wino/regiony", "regex": "^/encyklopedia/wino/regiony(?:/)?$", "routeKeys": {}, "namedRegex": "^/encyklopedia/wino/regiony(?:/)?$" }, { "page": "/encyklopedia/wino/szczepy", "regex": "^/encyklopedia/wino/szczepy(?:/)?$", "routeKeys": {}, "namedRegex": "^/encyklopedia/wino/szczepy(?:/)?$" }, { "page": "/kawiarnia", "regex": "^/kawiarnia(?:/)?$", "routeKeys": {}, "namedRegex": "^/kawiarnia(?:/)?$" }, { "page": "/order/confirmation", "regex": "^/order/confirmation(?:/)?$", "routeKeys": {}, "namedRegex": "^/order/confirmation(?:/)?$" }, { "page": "/sklep", "regex": "^/sklep(?:/)?$", "routeKeys": {}, "namedRegex": "^/sklep(?:/)?$" }], "dynamic": [{ "page": "/account/orders/[id]", "regex": "^/account/orders/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/account/orders/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/admin/orders/[id]", "regex": "^/admin/orders/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/admin/orders/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/admin/products/[sku]", "regex": "^/admin/products/([^/]+?)(?:/)?$", "routeKeys": { "nxtPsku": "nxtPsku" }, "namedRegex": "^/admin/products/(?<nxtPsku>[^/]+?)(?:/)?$" }, { "page": "/admin/products/[sku]/wine", "regex": "^/admin/products/([^/]+?)/wine(?:/)?$", "routeKeys": { "nxtPsku": "nxtPsku" }, "namedRegex": "^/admin/products/(?<nxtPsku>[^/]+?)/wine(?:/)?$" }, { "page": "/api/admin/allegro/[...slug]", "regex": "^/api/admin/allegro/(.+?)(?:/)?$", "routeKeys": { "nxtPslug": "nxtPslug" }, "namedRegex": "^/api/admin/allegro/(?<nxtPslug>.+?)(?:/)?$" }, { "page": "/api/admin/[...slug]", "regex": "^/api/admin/(.+?)(?:/)?$", "routeKeys": { "nxtPslug": "nxtPslug" }, "namedRegex": "^/api/admin/(?<nxtPslug>.+?)(?:/)?$" }, { "page": "/encyklopedia/wino/regiony/[slug]", "regex": "^/encyklopedia/wino/regiony/([^/]+?)(?:/)?$", "routeKeys": { "nxtPslug": "nxtPslug" }, "namedRegex": "^/encyklopedia/wino/regiony/(?<nxtPslug>[^/]+?)(?:/)?$" }, { "page": "/encyklopedia/wino/szczepy/[slug]", "regex": "^/encyklopedia/wino/szczepy/([^/]+?)(?:/)?$", "routeKeys": { "nxtPslug": "nxtPslug" }, "namedRegex": "^/encyklopedia/wino/szczepy/(?<nxtPslug>[^/]+?)(?:/)?$" }, { "page": "/encyklopedia/wino/[section]", "regex": "^/encyklopedia/wino/([^/]+?)(?:/)?$", "routeKeys": { "nxtPsection": "nxtPsection" }, "namedRegex": "^/encyklopedia/wino/(?<nxtPsection>[^/]+?)(?:/)?$" }, { "page": "/encyklopedia/[category]", "regex": "^/encyklopedia/([^/]+?)(?:/)?$", "routeKeys": { "nxtPcategory": "nxtPcategory" }, "namedRegex": "^/encyklopedia/(?<nxtPcategory>[^/]+?)(?:/)?$" }, { "page": "/sklep/[category]", "regex": "^/sklep/([^/]+?)(?:/)?$", "routeKeys": { "nxtPcategory": "nxtPcategory" }, "namedRegex": "^/sklep/(?<nxtPcategory>[^/]+?)(?:/)?$" }, { "page": "/sklep/[category]/[slug]", "regex": "^/sklep/([^/]+?)/([^/]+?)(?:/)?$", "routeKeys": { "nxtPcategory": "nxtPcategory", "nxtPslug": "nxtPslug" }, "namedRegex": "^/sklep/(?<nxtPcategory>[^/]+?)/(?<nxtPslug>[^/]+?)(?:/)?$" }, { "page": "/sklep/[category]/[slug]/opengraph-image", "regex": "^/sklep/([^/]+?)/([^/]+?)/opengraph\\-image(?:/)?$", "routeKeys": { "nxtPcategory": "nxtPcategory", "nxtPslug": "nxtPslug" }, "namedRegex": "^/sklep/(?<nxtPcategory>[^/]+?)/(?<nxtPslug>[^/]+?)/opengraph\\-image(?:/)?$" }], "data": { "static": [], "dynamic": [] } }, "locales": [] };
var ConfigHeaders = [{ "source": "/:path*", "headers": [{ "key": "X-Content-Type-Options", "value": "nosniff" }, { "key": "X-Frame-Options", "value": "DENY" }, { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }, { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), interest-cohort=()" }, { "key": "Cross-Origin-Opener-Policy", "value": "same-origin-allow-popups" }, { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }, { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" }], "regex": "^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }];
var PrerenderManifest = { "version": 4, "routes": { "/_global-error": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/_global-error", "dataRoute": "/_global-error.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/_not-found": { "initialStatus": 404, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/_not-found", "dataRoute": "/_not-found.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/account/data-export": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/account/data-export", "dataRoute": "/account/data-export.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/account": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/account", "dataRoute": "/account.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/auth": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/auth", "dataRoute": "/auth.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/checkout": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/checkout", "dataRoute": "/checkout.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/checkout/payment": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/checkout/payment", "dataRoute": "/checkout/payment.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia", "dataRoute": "/encyklopedia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/degustacja": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/[section]", "dataRoute": "/encyklopedia/wino/degustacja.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/klasyfikacje": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/[section]", "dataRoute": "/encyklopedia/wino/klasyfikacje.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/parowanie": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/[section]", "dataRoute": "/encyklopedia/wino/parowanie.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/podstawy": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/[section]", "dataRoute": "/encyklopedia/wino/podstawy.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/produkcja": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/[section]", "dataRoute": "/encyklopedia/wino/produkcja.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/przechowywanie": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/[section]", "dataRoute": "/encyklopedia/wino/przechowywanie.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/roczniki": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/[section]", "dataRoute": "/encyklopedia/wino/roczniki.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/serwowanie": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/[section]", "dataRoute": "/encyklopedia/wino/serwowanie.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/slownik": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/[section]", "dataRoute": "/encyklopedia/wino/slownik.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/winnice": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/[section]", "dataRoute": "/encyklopedia/wino/winnice.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino", "dataRoute": "/encyklopedia/wino.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/regiony/bordeaux": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/regiony/[slug]", "dataRoute": "/encyklopedia/wino/regiony/bordeaux.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/regiony/burgundia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/regiony/[slug]", "dataRoute": "/encyklopedia/wino/regiony/burgundia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/regiony/dolina-rodanu": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/regiony/[slug]", "dataRoute": "/encyklopedia/wino/regiony/dolina-rodanu.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/regiony/mendoza": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/regiony/[slug]", "dataRoute": "/encyklopedia/wino/regiony/mendoza.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/regiony/mosel": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/regiony/[slug]", "dataRoute": "/encyklopedia/wino/regiony/mosel.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/regiony/napa-valley": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/regiony/[slug]", "dataRoute": "/encyklopedia/wino/regiony/napa-valley.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/regiony/piemont": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/regiony/[slug]", "dataRoute": "/encyklopedia/wino/regiony/piemont.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/regiony/ribera-del-duero": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/regiony/[slug]", "dataRoute": "/encyklopedia/wino/regiony/ribera-del-duero.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/regiony/rioja": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/regiony/[slug]", "dataRoute": "/encyklopedia/wino/regiony/rioja.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/regiony/szampania": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/regiony/[slug]", "dataRoute": "/encyklopedia/wino/regiony/szampania.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/regiony/toskania": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/regiony/[slug]", "dataRoute": "/encyklopedia/wino/regiony/toskania.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/regiony/wenecja-euganejska": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/regiony/[slug]", "dataRoute": "/encyklopedia/wino/regiony/wenecja-euganejska.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/regiony": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/regiony", "dataRoute": "/encyklopedia/wino/regiony.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy/cabernet-sauvignon": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/szczepy/[slug]", "dataRoute": "/encyklopedia/wino/szczepy/cabernet-sauvignon.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy/chardonnay": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/szczepy/[slug]", "dataRoute": "/encyklopedia/wino/szczepy/chardonnay.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy/gewurztraminer": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/szczepy/[slug]", "dataRoute": "/encyklopedia/wino/szczepy/gewurztraminer.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy/malbec": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/szczepy/[slug]", "dataRoute": "/encyklopedia/wino/szczepy/malbec.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy/merlot": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/szczepy/[slug]", "dataRoute": "/encyklopedia/wino/szczepy/merlot.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy/nebbiolo": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/szczepy/[slug]", "dataRoute": "/encyklopedia/wino/szczepy/nebbiolo.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy/pinot-grigio": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/szczepy/[slug]", "dataRoute": "/encyklopedia/wino/szczepy/pinot-grigio.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy/pinot-noir": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/szczepy/[slug]", "dataRoute": "/encyklopedia/wino/szczepy/pinot-noir.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy/riesling": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/szczepy/[slug]", "dataRoute": "/encyklopedia/wino/szczepy/riesling.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy/sangiovese": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/szczepy/[slug]", "dataRoute": "/encyklopedia/wino/szczepy/sangiovese.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy/sauvignon-blanc": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/szczepy/[slug]", "dataRoute": "/encyklopedia/wino/szczepy/sauvignon-blanc.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy/syrah": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/szczepy/[slug]", "dataRoute": "/encyklopedia/wino/szczepy/syrah.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy/tempranillo": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/szczepy/[slug]", "dataRoute": "/encyklopedia/wino/szczepy/tempranillo.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy/viognier": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/szczepy/[slug]", "dataRoute": "/encyklopedia/wino/szczepy/viognier.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/encyklopedia/wino/szczepy", "dataRoute": "/encyklopedia/wino/szczepy.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/kawiarnia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/kawiarnia", "dataRoute": "/kawiarnia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/order/confirmation": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/order/confirmation", "dataRoute": "/order/confirmation.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 1800, "initialExpireSeconds": 31536e3, "srcRoute": "/", "dataRoute": "/index.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/kawa/brazil-santos-1kg": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 3600, "initialExpireSeconds": 31536e3, "srcRoute": "/sklep/[category]/[slug]", "dataRoute": "/sklep/kawa/brazil-santos-1kg.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/kawa/colombia-supremo": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 3600, "initialExpireSeconds": 31536e3, "srcRoute": "/sklep/[category]/[slug]", "dataRoute": "/sklep/kawa/colombia-supremo.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/kawa/ethiopia-yirgacheffe": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 3600, "initialExpireSeconds": 31536e3, "srcRoute": "/sklep/[category]/[slug]", "dataRoute": "/sklep/kawa/ethiopia-yirgacheffe.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/slodycze/cantucci-alle-mandorle": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 3600, "initialExpireSeconds": 31536e3, "srcRoute": "/sklep/[category]/[slug]", "dataRoute": "/sklep/slodycze/cantucci-alle-mandorle.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/slodycze/panettone-tradizionale": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 3600, "initialExpireSeconds": 31536e3, "srcRoute": "/sklep/[category]/[slug]", "dataRoute": "/sklep/slodycze/panettone-tradizionale.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/spizarnia/oliwa-extra-virgin-dop": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 3600, "initialExpireSeconds": 31536e3, "srcRoute": "/sklep/[category]/[slug]", "dataRoute": "/sklep/spizarnia/oliwa-extra-virgin-dop.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/spizarnia/parmigiano-reggiano-24m": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 3600, "initialExpireSeconds": 31536e3, "srcRoute": "/sklep/[category]/[slug]", "dataRoute": "/sklep/spizarnia/parmigiano-reggiano-24m.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/wino/barahonda-organic-barrica": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 3600, "initialExpireSeconds": 31536e3, "srcRoute": "/sklep/[category]/[slug]", "dataRoute": "/sklep/wino/barahonda-organic-barrica.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/wino/brunello-di-montalcino-2018": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 3600, "initialExpireSeconds": 31536e3, "srcRoute": "/sklep/[category]/[slug]", "dataRoute": "/sklep/wino/brunello-di-montalcino-2018.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/wino/chianti-classico-riserva-2020": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 3600, "initialExpireSeconds": 31536e3, "srcRoute": "/sklep/[category]/[slug]", "dataRoute": "/sklep/wino/chianti-classico-riserva-2020.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/alcohol": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 300, "initialExpireSeconds": 31536e3, "srcRoute": "/sklep/[category]", "dataRoute": "/sklep/alcohol.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/coffee": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 300, "initialExpireSeconds": 31536e3, "srcRoute": "/sklep/[category]", "dataRoute": "/sklep/coffee.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/pantry": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 300, "initialExpireSeconds": 31536e3, "srcRoute": "/sklep/[category]", "dataRoute": "/sklep/pantry.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/sweets": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 300, "initialExpireSeconds": 31536e3, "srcRoute": "/sklep/[category]", "dataRoute": "/sklep/sweets.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 300, "initialExpireSeconds": 31536e3, "srcRoute": "/sklep", "dataRoute": "/sklep.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] } }, "dynamicRoutes": { "/encyklopedia/wino/[section]": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/encyklopedia/wino/([^/]+?)(?:/)?$", "dataRoute": "/encyklopedia/wino/[section].rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/encyklopedia/wino/([^/]+?)\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/regiony/[slug]": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/encyklopedia/wino/regiony/([^/]+?)(?:/)?$", "dataRoute": "/encyklopedia/wino/regiony/[slug].rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/encyklopedia/wino/regiony/([^/]+?)\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/encyklopedia/wino/szczepy/[slug]": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/encyklopedia/wino/szczepy/([^/]+?)(?:/)?$", "dataRoute": "/encyklopedia/wino/szczepy/[slug].rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/encyklopedia/wino/szczepy/([^/]+?)\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/[category]/[slug]": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/sklep/([^/]+?)/([^/]+?)(?:/)?$", "dataRoute": "/sklep/[category]/[slug].rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/sklep/([^/]+?)/([^/]+?)\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sklep/[category]": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/sklep/([^/]+?)(?:/)?$", "dataRoute": "/sklep/[category].rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/sklep/([^/]+?)\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] } }, "notFoundRoutes": [], "preview": { "previewModeId": "bf8cc26a9a5863fc636896214e67c7c1", "previewModeSigningKey": "8e273358837836df17d82464892178b50115d8d61a4ea6b2be1bb834cf546cb5", "previewModeEncryptionKey": "e0d406351a55ce30bfbb1230f3bb45d5b3f3f9db88c649eee6059a2455bc110f" } };
var MiddlewareManifest = { "version": 3, "middleware": { "/": { "files": ["server/edge-runtime-webpack.js", "server/src/middleware.js"], "name": "src/middleware", "page": "/", "matchers": [{ "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/admin(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/admin/:path*" }], "wasm": [], "assets": [], "env": { "__NEXT_BUILD_ID": "AeyNuS0dPbfXEpIkaONAN", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY": "odkEPXZQIveiuOr4lpb8DyLKiu61BaVPRMFlJB00Bnw=", "__NEXT_PREVIEW_MODE_ID": "bf8cc26a9a5863fc636896214e67c7c1", "__NEXT_PREVIEW_MODE_SIGNING_KEY": "8e273358837836df17d82464892178b50115d8d61a4ea6b2be1bb834cf546cb5", "__NEXT_PREVIEW_MODE_ENCRYPTION_KEY": "e0d406351a55ce30bfbb1230f3bb45d5b3f3f9db88c649eee6059a2455bc110f" } } }, "functions": {}, "sortedMiddleware": ["/"] };
var AppPathRoutesManifest = { "/_not-found/page": "/_not-found", "/_global-error/page": "/_global-error", "/api/admin/logout/route": "/api/admin/logout", "/api/admin/[...slug]/route": "/api/admin/[...slug]", "/api/admin/allegro/[...slug]/route": "/api/admin/allegro/[...slug]", "/sklep/[category]/[slug]/opengraph-image/route": "/sklep/[category]/[slug]/opengraph-image", "/auth/page": "/auth", "/kawiarnia/page": "/kawiarnia", "/page": "/", "/sklep/page": "/sklep", "/sklep/[category]/page": "/sklep/[category]", "/sklep/[category]/[slug]/page": "/sklep/[category]/[slug]", "/account/data-export/page": "/account/data-export", "/account/orders/[id]/page": "/account/orders/[id]", "/account/page": "/account", "/admin/allegro/page": "/admin/allegro", "/admin/content/page": "/admin/content", "/admin/customers/page": "/admin/customers", "/admin/marketing/promotions/page": "/admin/marketing/promotions", "/admin/audit/page": "/admin/audit", "/admin/orders/page": "/admin/orders", "/admin/products/[sku]/page": "/admin/products/[sku]", "/admin/finance/page": "/admin/finance", "/admin/orders/[id]/page": "/admin/orders/[id]", "/admin/products/page": "/admin/products", "/admin/page": "/admin", "/checkout/payment/page": "/checkout/payment", "/admin/products/[sku]/wine/page": "/admin/products/[sku]/wine", "/admin/settings/page": "/admin/settings", "/checkout/page": "/checkout", "/encyklopedia/[category]/page": "/encyklopedia/[category]", "/encyklopedia/page": "/encyklopedia", "/encyklopedia/wino/page": "/encyklopedia/wino", "/encyklopedia/wino/regiony/page": "/encyklopedia/wino/regiony", "/encyklopedia/wino/[section]/page": "/encyklopedia/wino/[section]", "/encyklopedia/wino/regiony/[slug]/page": "/encyklopedia/wino/regiony/[slug]", "/encyklopedia/wino/szczepy/page": "/encyklopedia/wino/szczepy", "/encyklopedia/wino/szczepy/[slug]/page": "/encyklopedia/wino/szczepy/[slug]", "/order/confirmation/page": "/order/confirmation", "/admin/login/page": "/admin/login" };
var FunctionsConfigManifest = { "version": 1, "functions": {} };
var PagesManifest = { "/404": "pages/404.html", "/500": "pages/500.html" };
process.env.NEXT_BUILD_ID = BuildId;
process.env.NEXT_PREVIEW_MODE_ID = PrerenderManifest?.preview?.previewModeId;

// ../../node_modules/@opennextjs/aws/dist/http/openNextResponse.js
init_logger();
init_util();
import { Transform } from "node:stream";

// ../../node_modules/@opennextjs/aws/dist/core/routing/util.js
init_util();
init_logger();
import { ReadableStream as ReadableStream2 } from "node:stream/web";

// ../../node_modules/@opennextjs/aws/dist/utils/binary.js
var commonBinaryMimeTypes = /* @__PURE__ */ new Set([
  "application/octet-stream",
  // Docs
  "application/epub+zip",
  "application/msword",
  "application/pdf",
  "application/rtf",
  "application/vnd.amazon.ebook",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Fonts
  "font/otf",
  "font/woff",
  "font/woff2",
  // Images
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/vnd.microsoft.icon",
  "image/webp",
  // Audio
  "audio/3gpp",
  "audio/aac",
  "audio/basic",
  "audio/flac",
  "audio/mpeg",
  "audio/ogg",
  "audio/wavaudio/webm",
  "audio/x-aiff",
  "audio/x-midi",
  "audio/x-wav",
  // Video
  "video/3gpp",
  "video/mp2t",
  "video/mpeg",
  "video/ogg",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  // Archives
  "application/java-archive",
  "application/vnd.apple.installer+xml",
  "application/x-7z-compressed",
  "application/x-apple-diskimage",
  "application/x-bzip",
  "application/x-bzip2",
  "application/x-gzip",
  "application/x-java-archive",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/x-zip",
  "application/zip",
  // Serialized data
  "application/x-protobuf"
]);
function isBinaryContentType(contentType) {
  if (!contentType)
    return false;
  const value = contentType.split(";")[0];
  return commonBinaryMimeTypes.has(value);
}

// ../../node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
init_stream();
init_logger();

// ../../node_modules/@opennextjs/aws/dist/core/routing/i18n/accept-header.js
function parse(raw, preferences, options) {
  const lowers = /* @__PURE__ */ new Map();
  const header = raw.replace(/[ \t]/g, "");
  if (preferences) {
    let pos = 0;
    for (const preference of preferences) {
      const lower = preference.toLowerCase();
      lowers.set(lower, { orig: preference, pos: pos++ });
      if (options.prefixMatch) {
        const parts2 = lower.split("-");
        while (parts2.pop(), parts2.length > 0) {
          const joined = parts2.join("-");
          if (!lowers.has(joined)) {
            lowers.set(joined, { orig: preference, pos: pos++ });
          }
        }
      }
    }
  }
  const parts = header.split(",");
  const selections = [];
  const map = /* @__PURE__ */ new Set();
  for (let i = 0; i < parts.length; ++i) {
    const part = parts[i];
    if (!part) {
      continue;
    }
    const params = part.split(";");
    if (params.length > 2) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const token = params[0].toLowerCase();
    if (!token) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const selection = { token, pos: i, q: 1 };
    if (preferences && lowers.has(token)) {
      selection.pref = lowers.get(token).pos;
    }
    map.add(selection.token);
    if (params.length === 2) {
      const q = params[1];
      const [key, value] = q.split("=");
      if (!value || key !== "q" && key !== "Q") {
        throw new Error(`Invalid ${options.type} header`);
      }
      const score = Number.parseFloat(value);
      if (score === 0) {
        continue;
      }
      if (Number.isFinite(score) && score <= 1 && score >= 1e-3) {
        selection.q = score;
      }
    }
    selections.push(selection);
  }
  selections.sort((a, b) => {
    if (b.q !== a.q) {
      return b.q - a.q;
    }
    if (b.pref !== a.pref) {
      if (a.pref === void 0) {
        return 1;
      }
      if (b.pref === void 0) {
        return -1;
      }
      return a.pref - b.pref;
    }
    return a.pos - b.pos;
  });
  const values = selections.map((selection) => selection.token);
  if (!preferences || !preferences.length) {
    return values;
  }
  const preferred = [];
  for (const selection of values) {
    if (selection === "*") {
      for (const [preference, value] of lowers) {
        if (!map.has(preference)) {
          preferred.push(value.orig);
        }
      }
    } else {
      const lower = selection.toLowerCase();
      if (lowers.has(lower)) {
        preferred.push(lowers.get(lower).orig);
      }
    }
  }
  return preferred;
}
function acceptLanguage(header = "", preferences) {
  return parse(header, preferences, {
    type: "accept-language",
    prefixMatch: true
  })[0] || void 0;
}

// ../../node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
function isLocalizedPath(path3) {
  return NextConfig.i18n?.locales.includes(path3.split("/")[1].toLowerCase()) ?? false;
}
function getLocaleFromCookie(cookies) {
  const i18n = NextConfig.i18n;
  const nextLocale = cookies.NEXT_LOCALE?.toLowerCase();
  return nextLocale ? i18n?.locales.find((locale) => nextLocale === locale.toLowerCase()) : void 0;
}
function detectDomainLocale({ hostname, detectedLocale }) {
  const i18n = NextConfig.i18n;
  const domains = i18n?.domains;
  if (!domains) {
    return;
  }
  const lowercasedLocale = detectedLocale?.toLowerCase();
  for (const domain of domains) {
    const domainHostname = domain.domain.split(":", 1)[0].toLowerCase();
    if (hostname === domainHostname || lowercasedLocale === domain.defaultLocale.toLowerCase() || domain.locales?.some((locale) => lowercasedLocale === locale.toLowerCase())) {
      return domain;
    }
  }
}
function detectLocale(internalEvent, i18n) {
  const domainLocale = detectDomainLocale({
    hostname: internalEvent.headers.host
  });
  if (i18n.localeDetection === false) {
    return domainLocale?.defaultLocale ?? i18n.defaultLocale;
  }
  const cookiesLocale = getLocaleFromCookie(internalEvent.cookies);
  const preferredLocale = acceptLanguage(internalEvent.headers["accept-language"], i18n?.locales);
  debug({
    cookiesLocale,
    preferredLocale,
    defaultLocale: i18n.defaultLocale,
    domainLocale
  });
  return domainLocale?.defaultLocale ?? cookiesLocale ?? preferredLocale ?? i18n.defaultLocale;
}
function localizePath(internalEvent) {
  const i18n = NextConfig.i18n;
  if (!i18n) {
    return internalEvent.rawPath;
  }
  if (isLocalizedPath(internalEvent.rawPath)) {
    return internalEvent.rawPath;
  }
  const detectedLocale = detectLocale(internalEvent, i18n);
  return `/${detectedLocale}${internalEvent.rawPath}`;
}
function handleLocaleRedirect(internalEvent) {
  const i18n = NextConfig.i18n;
  if (!i18n || i18n.localeDetection === false || internalEvent.rawPath !== "/") {
    return false;
  }
  const preferredLocale = acceptLanguage(internalEvent.headers["accept-language"], i18n?.locales);
  const detectedLocale = detectLocale(internalEvent, i18n);
  const domainLocale = detectDomainLocale({
    hostname: internalEvent.headers.host
  });
  const preferredDomain = detectDomainLocale({
    detectedLocale: preferredLocale
  });
  if (domainLocale && preferredDomain) {
    const isPDomain = preferredDomain.domain === domainLocale.domain;
    const isPLocale = preferredDomain.defaultLocale === preferredLocale;
    if (!isPDomain || !isPLocale) {
      const scheme = `http${preferredDomain.http ? "" : "s"}`;
      const rlocale = isPLocale ? "" : preferredLocale;
      return {
        type: "core",
        statusCode: 307,
        headers: {
          Location: `${scheme}://${preferredDomain.domain}/${rlocale}`
        },
        body: emptyReadableStream(),
        isBase64Encoded: false
      };
    }
  }
  const defaultLocale = domainLocale?.defaultLocale ?? i18n.defaultLocale;
  if (detectedLocale.toLowerCase() !== defaultLocale.toLowerCase()) {
    return {
      type: "core",
      statusCode: 307,
      headers: {
        Location: constructNextUrl(internalEvent.url, `/${detectedLocale}`)
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
  return false;
}

// ../../node_modules/@opennextjs/aws/dist/core/routing/queue.js
function generateShardId(rawPath, maxConcurrency, prefix) {
  let a = cyrb128(rawPath);
  let t = a += 1831565813;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  const randomFloat = ((t ^ t >>> 14) >>> 0) / 4294967296;
  const randomInt = Math.floor(randomFloat * maxConcurrency);
  return `${prefix}-${randomInt}`;
}
function generateMessageGroupId(rawPath) {
  const maxConcurrency = Number.parseInt(process.env.MAX_REVALIDATE_CONCURRENCY ?? "10");
  return generateShardId(rawPath, maxConcurrency, "revalidate");
}
function cyrb128(str) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ h1 >>> 18, 597399067);
  h2 = Math.imul(h4 ^ h2 >>> 22, 2869860233);
  h3 = Math.imul(h1 ^ h3 >>> 17, 951274213);
  h4 = Math.imul(h2 ^ h4 >>> 19, 2716044179);
  h1 ^= h2 ^ h3 ^ h4, h2 ^= h1, h3 ^= h1, h4 ^= h1;
  return h1 >>> 0;
}

// ../../node_modules/@opennextjs/aws/dist/core/routing/util.js
function isExternal(url, host) {
  if (!url)
    return false;
  const pattern = /^https?:\/\//;
  if (!pattern.test(url))
    return false;
  if (host) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.host !== host;
    } catch {
      return !url.includes(host);
    }
  }
  return true;
}
function convertFromQueryString(query) {
  if (query === "")
    return {};
  const queryParts = query.split("&");
  return getQueryFromIterator(queryParts.map((p) => {
    const [key, value] = p.split("=");
    return [key, value];
  }));
}
function getUrlParts(url, isExternal2) {
  if (!isExternal2) {
    const regex2 = /\/([^?]*)\??(.*)/;
    const match3 = url.match(regex2);
    return {
      hostname: "",
      pathname: match3?.[1] ? `/${match3[1]}` : url,
      protocol: "",
      queryString: match3?.[2] ?? ""
    };
  }
  const regex = /^(https?:)\/\/?([^\/\s]+)(\/[^?]*)?(\?.*)?/;
  const match2 = url.match(regex);
  if (!match2) {
    throw new Error(`Invalid external URL: ${url}`);
  }
  return {
    protocol: match2[1] ?? "https:",
    hostname: match2[2],
    pathname: match2[3] ?? "",
    queryString: match2[4]?.slice(1) ?? ""
  };
}
function constructNextUrl(baseUrl, path3) {
  const nextBasePath = NextConfig.basePath ?? "";
  const url = new URL(`${nextBasePath}${path3}`, baseUrl);
  return url.href;
}
function convertToQueryString(query) {
  const queryStrings = [];
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => queryStrings.push(`${key}=${entry}`));
    } else {
      queryStrings.push(`${key}=${value}`);
    }
  });
  return queryStrings.length > 0 ? `?${queryStrings.join("&")}` : "";
}
function getMiddlewareMatch(middlewareManifest2, functionsManifest) {
  if (functionsManifest?.functions?.["/_middleware"]) {
    return functionsManifest.functions["/_middleware"].matchers?.map(({ regexp }) => new RegExp(regexp)) ?? [/.*/];
  }
  const rootMiddleware = middlewareManifest2.middleware["/"];
  if (!rootMiddleware?.matchers)
    return [];
  return rootMiddleware.matchers.map(({ regexp }) => new RegExp(regexp));
}
function escapeRegex(str, { isPath } = {}) {
  const result = str.replaceAll("(.)", "_\xB51_").replaceAll("(..)", "_\xB52_").replaceAll("(...)", "_\xB53_");
  return isPath ? result : result.replaceAll("+", "_\xB54_");
}
function unescapeRegex(str) {
  return str.replaceAll("_\xB51_", "(.)").replaceAll("_\xB52_", "(..)").replaceAll("_\xB53_", "(...)").replaceAll("_\xB54_", "+");
}
function convertBodyToReadableStream(method, body) {
  if (method === "GET" || method === "HEAD")
    return void 0;
  if (!body)
    return void 0;
  return new ReadableStream2({
    start(controller) {
      controller.enqueue(body);
      controller.close();
    }
  });
}
var CommonHeaders;
(function(CommonHeaders2) {
  CommonHeaders2["CACHE_CONTROL"] = "cache-control";
  CommonHeaders2["NEXT_CACHE"] = "x-nextjs-cache";
})(CommonHeaders || (CommonHeaders = {}));
function normalizeLocationHeader(location, baseUrl, encodeQuery = false) {
  if (!URL.canParse(location)) {
    return location;
  }
  const locationURL = new URL(location);
  const origin = new URL(baseUrl).origin;
  let search = locationURL.search;
  if (encodeQuery && search) {
    search = `?${stringifyQs(parseQs(search.slice(1)))}`;
  }
  const href = `${locationURL.origin}${locationURL.pathname}${search}${locationURL.hash}`;
  if (locationURL.origin === origin) {
    return href.slice(origin.length);
  }
  return href;
}

// ../../node_modules/@opennextjs/aws/dist/core/routingHandler.js
init_logger();

// ../../node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
import { createHash } from "node:crypto";
init_stream();

// ../../node_modules/@opennextjs/aws/dist/utils/cache.js
init_logger();
async function hasBeenRevalidated(key, tags, cacheEntry) {
  if (globalThis.openNextConfig.dangerous?.disableTagCache) {
    return false;
  }
  const value = cacheEntry.value;
  if (!value) {
    return true;
  }
  if ("type" in cacheEntry && cacheEntry.type === "page") {
    return false;
  }
  const lastModified = cacheEntry.lastModified ?? Date.now();
  if (globalThis.tagCache.mode === "nextMode") {
    return tags.length === 0 ? false : await globalThis.tagCache.hasBeenRevalidated(tags, lastModified);
  }
  const _lastModified = await globalThis.tagCache.getLastModified(key, lastModified);
  return _lastModified === -1;
}
function getTagsFromValue(value) {
  if (!value) {
    return [];
  }
  try {
    const cacheTags = value.meta?.headers?.["x-next-cache-tags"]?.split(",") ?? [];
    delete value.meta?.headers?.["x-next-cache-tags"];
    return cacheTags;
  } catch (e) {
    return [];
  }
}

// ../../node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
init_logger();
var CACHE_ONE_YEAR = 60 * 60 * 24 * 365;
var CACHE_ONE_MONTH = 60 * 60 * 24 * 30;
var VARY_HEADER = "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Next-Url";
var NEXT_SEGMENT_PREFETCH_HEADER = "next-router-segment-prefetch";
var NEXT_PRERENDER_HEADER = "x-nextjs-prerender";
var NEXT_POSTPONED_HEADER = "x-nextjs-postponed";
async function computeCacheControl(path3, body, host, revalidate, lastModified) {
  let finalRevalidate = CACHE_ONE_YEAR;
  const existingRoute = Object.entries(PrerenderManifest?.routes ?? {}).find((p) => p[0] === path3)?.[1];
  if (revalidate === void 0 && existingRoute) {
    finalRevalidate = existingRoute.initialRevalidateSeconds === false ? CACHE_ONE_YEAR : existingRoute.initialRevalidateSeconds;
  } else if (revalidate !== void 0) {
    finalRevalidate = revalidate === false ? CACHE_ONE_YEAR : revalidate;
  }
  const age = Math.round((Date.now() - (lastModified ?? 0)) / 1e3);
  const hash = (str) => createHash("md5").update(str).digest("hex");
  const etag = hash(body);
  if (revalidate === 0) {
    return {
      "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
      "x-opennext-cache": "ERROR",
      etag
    };
  }
  if (finalRevalidate !== CACHE_ONE_YEAR) {
    const sMaxAge = Math.max(finalRevalidate - age, 1);
    debug("sMaxAge", {
      finalRevalidate,
      age,
      lastModified,
      revalidate
    });
    const isStale = sMaxAge === 1;
    if (isStale) {
      let url = NextConfig.trailingSlash ? `${path3}/` : path3;
      if (NextConfig.basePath) {
        url = `${NextConfig.basePath}${url}`;
      }
      await globalThis.queue.send({
        MessageBody: {
          host,
          url,
          eTag: etag,
          lastModified: lastModified ?? Date.now()
        },
        MessageDeduplicationId: hash(`${path3}-${lastModified}-${etag}`),
        MessageGroupId: generateMessageGroupId(path3)
      });
    }
    return {
      "cache-control": `s-maxage=${sMaxAge}, stale-while-revalidate=${CACHE_ONE_MONTH}`,
      "x-opennext-cache": isStale ? "STALE" : "HIT",
      etag
    };
  }
  return {
    "cache-control": `s-maxage=${CACHE_ONE_YEAR}, stale-while-revalidate=${CACHE_ONE_MONTH}`,
    "x-opennext-cache": "HIT",
    etag
  };
}
function getBodyForAppRouter(event, cachedValue) {
  if (cachedValue.type !== "app") {
    throw new Error("getBodyForAppRouter called with non-app cache value");
  }
  try {
    const segmentHeader = `${event.headers[NEXT_SEGMENT_PREFETCH_HEADER]}`;
    const isSegmentResponse = Boolean(segmentHeader) && segmentHeader in (cachedValue.segmentData || {});
    const body = isSegmentResponse ? cachedValue.segmentData[segmentHeader] : cachedValue.rsc;
    return {
      body,
      additionalHeaders: isSegmentResponse ? { [NEXT_PRERENDER_HEADER]: "1", [NEXT_POSTPONED_HEADER]: "2" } : {}
    };
  } catch (e) {
    error("Error while getting body for app router from cache:", e);
    return { body: cachedValue.rsc, additionalHeaders: {} };
  }
}
async function generateResult(event, localizedPath, cachedValue, lastModified) {
  debug("Returning result from experimental cache");
  let body = "";
  let type = "application/octet-stream";
  let isDataRequest = false;
  let additionalHeaders = {};
  if (cachedValue.type === "app") {
    isDataRequest = Boolean(event.headers.rsc);
    if (isDataRequest) {
      const { body: appRouterBody, additionalHeaders: appHeaders } = getBodyForAppRouter(event, cachedValue);
      body = appRouterBody;
      additionalHeaders = appHeaders;
    } else {
      body = cachedValue.html;
    }
    type = isDataRequest ? "text/x-component" : "text/html; charset=utf-8";
  } else if (cachedValue.type === "page") {
    isDataRequest = Boolean(event.query.__nextDataReq);
    body = isDataRequest ? JSON.stringify(cachedValue.json) : cachedValue.html;
    type = isDataRequest ? "application/json" : "text/html; charset=utf-8";
  } else {
    throw new Error("generateResult called with unsupported cache value type, only 'app' and 'page' are supported");
  }
  const cacheControl = await computeCacheControl(localizedPath, body, event.headers.host, cachedValue.revalidate, lastModified);
  return {
    type: "core",
    // Sometimes other status codes can be cached, like 404. For these cases, we should return the correct status code
    // Also set the status code to the rewriteStatusCode if defined
    // This can happen in handleMiddleware in routingHandler.
    // `NextResponse.rewrite(url, { status: xxx})
    // The rewrite status code should take precedence over the cached one
    statusCode: event.rewriteStatusCode ?? cachedValue.meta?.status ?? 200,
    body: toReadableStream(body, false),
    isBase64Encoded: false,
    headers: {
      ...cacheControl,
      "content-type": type,
      ...cachedValue.meta?.headers,
      vary: VARY_HEADER,
      ...additionalHeaders
    }
  };
}
function escapePathDelimiters(segment, escapeEncoded) {
  return segment.replace(new RegExp(`([/#?]${escapeEncoded ? "|%(2f|23|3f|5c)" : ""})`, "gi"), (char) => encodeURIComponent(char));
}
function decodePathParams(pathname) {
  return pathname.split("/").map((segment) => {
    try {
      return escapePathDelimiters(decodeURIComponent(segment), true);
    } catch (e) {
      return segment;
    }
  }).join("/");
}
async function cacheInterceptor(event) {
  if (Boolean(event.headers["next-action"]) || Boolean(event.headers["x-prerender-revalidate"]))
    return event;
  const cookies = event.headers.cookie || "";
  const hasPreviewData = cookies.includes("__prerender_bypass") || cookies.includes("__next_preview_data");
  if (hasPreviewData) {
    debug("Preview mode detected, passing through to handler");
    return event;
  }
  let localizedPath = localizePath(event);
  if (NextConfig.basePath) {
    localizedPath = localizedPath.replace(NextConfig.basePath, "");
  }
  localizedPath = localizedPath.replace(/\/$/, "");
  localizedPath = decodePathParams(localizedPath);
  debug("Checking cache for", localizedPath, PrerenderManifest);
  const isISR = Object.keys(PrerenderManifest?.routes ?? {}).includes(localizedPath ?? "/") || Object.values(PrerenderManifest?.dynamicRoutes ?? {}).some((dr) => new RegExp(dr.routeRegex).test(localizedPath));
  debug("isISR", isISR);
  if (isISR) {
    try {
      const cachedData = await globalThis.incrementalCache.get(localizedPath ?? "/index");
      debug("cached data in interceptor", cachedData);
      if (!cachedData?.value) {
        return event;
      }
      if (cachedData.value?.type === "app" || cachedData.value?.type === "route") {
        const tags = getTagsFromValue(cachedData.value);
        const _hasBeenRevalidated = cachedData.shouldBypassTagCache ? false : await hasBeenRevalidated(localizedPath, tags, cachedData);
        if (_hasBeenRevalidated) {
          return event;
        }
      }
      const host = event.headers.host;
      switch (cachedData?.value?.type) {
        case "app":
        case "page":
          return generateResult(event, localizedPath, cachedData.value, cachedData.lastModified);
        case "redirect": {
          const cacheControl = await computeCacheControl(localizedPath, "", host, cachedData.value.revalidate, cachedData.lastModified);
          return {
            type: "core",
            statusCode: cachedData.value.meta?.status ?? 307,
            body: emptyReadableStream(),
            headers: {
              ...cachedData.value.meta?.headers ?? {},
              ...cacheControl
            },
            isBase64Encoded: false
          };
        }
        case "route": {
          const cacheControl = await computeCacheControl(localizedPath, cachedData.value.body, host, cachedData.value.revalidate, cachedData.lastModified);
          const isBinary = isBinaryContentType(String(cachedData.value.meta?.headers?.["content-type"]));
          return {
            type: "core",
            statusCode: event.rewriteStatusCode ?? cachedData.value.meta?.status ?? 200,
            body: toReadableStream(cachedData.value.body, isBinary),
            headers: {
              ...cacheControl,
              ...cachedData.value.meta?.headers,
              vary: VARY_HEADER
            },
            isBase64Encoded: isBinary
          };
        }
        default:
          return event;
      }
    } catch (e) {
      debug("Error while fetching cache", e);
      return event;
    }
  }
  return event;
}

// ../../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
function parse2(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path3 = "";
  var tryConsume = function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  };
  var mustConsume = function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  };
  var consumeText = function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  };
  var isSafe = function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  };
  var safePattern = function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  };
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path3 += prefix;
        prefix = "";
      }
      if (path3) {
        result.push(path3);
        path3 = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path3 += value;
      continue;
    }
    if (path3) {
      result.push(path3);
      path3 = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
function compile(str, options) {
  return tokensToFunction(parse2(str, options), options);
}
function tokensToFunction(tokens, options) {
  if (options === void 0) {
    options = {};
  }
  var reFlags = flags(options);
  var _a = options.encode, encode = _a === void 0 ? function(x) {
    return x;
  } : _a, _b = options.validate, validate = _b === void 0 ? true : _b;
  var matches = tokens.map(function(token) {
    if (typeof token === "object") {
      return new RegExp("^(?:".concat(token.pattern, ")$"), reFlags);
    }
  });
  return function(data) {
    var path3 = "";
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (typeof token === "string") {
        path3 += token;
        continue;
      }
      var value = data ? data[token.name] : void 0;
      var optional = token.modifier === "?" || token.modifier === "*";
      var repeat = token.modifier === "*" || token.modifier === "+";
      if (Array.isArray(value)) {
        if (!repeat) {
          throw new TypeError('Expected "'.concat(token.name, '" to not repeat, but got an array'));
        }
        if (value.length === 0) {
          if (optional)
            continue;
          throw new TypeError('Expected "'.concat(token.name, '" to not be empty'));
        }
        for (var j = 0; j < value.length; j++) {
          var segment = encode(value[j], token);
          if (validate && !matches[i].test(segment)) {
            throw new TypeError('Expected all "'.concat(token.name, '" to match "').concat(token.pattern, '", but got "').concat(segment, '"'));
          }
          path3 += token.prefix + segment + token.suffix;
        }
        continue;
      }
      if (typeof value === "string" || typeof value === "number") {
        var segment = encode(String(value), token);
        if (validate && !matches[i].test(segment)) {
          throw new TypeError('Expected "'.concat(token.name, '" to match "').concat(token.pattern, '", but got "').concat(segment, '"'));
        }
        path3 += token.prefix + segment + token.suffix;
        continue;
      }
      if (optional)
        continue;
      var typeOfMessage = repeat ? "an array" : "a string";
      throw new TypeError('Expected "'.concat(token.name, '" to be ').concat(typeOfMessage));
    }
    return path3;
  };
}
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path3 = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    };
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path: path3, index, params };
  };
}
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
function regexpToRegexp(path3, keys) {
  if (!keys)
    return path3;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path3.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path3.source);
  }
  return path3;
}
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path3) {
    return pathToRegexp(path3, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
function stringToRegexp(path3, keys, options) {
  return tokensToRegexp(parse2(path3, options), keys, options);
}
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
function pathToRegexp(path3, keys, options) {
  if (path3 instanceof RegExp)
    return regexpToRegexp(path3, keys);
  if (Array.isArray(path3))
    return arrayToRegexp(path3, keys, options);
  return stringToRegexp(path3, keys, options);
}

// ../../node_modules/@opennextjs/aws/dist/utils/normalize-path.js
import path2 from "node:path";
function normalizeRepeatedSlashes(url) {
  const urlNoQuery = url.host + url.pathname;
  return `${url.protocol}//${urlNoQuery.replace(/\\/g, "/").replace(/\/\/+/g, "/")}${url.search}`;
}

// ../../node_modules/@opennextjs/aws/dist/core/routing/matcher.js
init_stream();
init_logger();

// ../../node_modules/@opennextjs/aws/dist/core/routing/routeMatcher.js
var optionalLocalePrefixRegex = `^/(?:${RoutesManifest.locales.map((locale) => `${locale}/?`).join("|")})?`;
var optionalBasepathPrefixRegex = RoutesManifest.basePath ? `^${RoutesManifest.basePath}/?` : "^/";
var optionalPrefix = optionalLocalePrefixRegex.replace("^/", optionalBasepathPrefixRegex);
function routeMatcher(routeDefinitions) {
  const regexp = routeDefinitions.map((route) => ({
    page: route.page,
    regexp: new RegExp(route.regex.replace("^/", optionalPrefix))
  }));
  const appPathsSet = /* @__PURE__ */ new Set();
  const routePathsSet = /* @__PURE__ */ new Set();
  for (const [k, v] of Object.entries(AppPathRoutesManifest)) {
    if (k.endsWith("page")) {
      appPathsSet.add(v);
    } else if (k.endsWith("route")) {
      routePathsSet.add(v);
    }
  }
  return function matchRoute(path3) {
    const foundRoutes = regexp.filter((route) => route.regexp.test(path3));
    return foundRoutes.map((foundRoute) => {
      let routeType = "page";
      if (appPathsSet.has(foundRoute.page)) {
        routeType = "app";
      } else if (routePathsSet.has(foundRoute.page)) {
        routeType = "route";
      }
      return {
        route: foundRoute.page,
        type: routeType
      };
    });
  };
}
var staticRouteMatcher = routeMatcher([
  ...RoutesManifest.routes.static,
  ...getStaticAPIRoutes()
]);
var dynamicRouteMatcher = routeMatcher(RoutesManifest.routes.dynamic);
function getStaticAPIRoutes() {
  const createRouteDefinition = (route) => ({
    page: route,
    regex: `^${route}(?:/)?$`
  });
  const dynamicRoutePages = new Set(RoutesManifest.routes.dynamic.map(({ page }) => page));
  const pagesStaticAPIRoutes = Object.keys(PagesManifest).filter((route) => route.startsWith("/api/") && !dynamicRoutePages.has(route)).map(createRouteDefinition);
  const appPathsStaticAPIRoutes = Object.values(AppPathRoutesManifest).filter((route) => (route.startsWith("/api/") || route === "/api") && !dynamicRoutePages.has(route)).map(createRouteDefinition);
  return [...pagesStaticAPIRoutes, ...appPathsStaticAPIRoutes];
}

// ../../node_modules/@opennextjs/aws/dist/core/routing/matcher.js
var routeHasMatcher = (headers, cookies, query) => (redirect) => {
  switch (redirect.type) {
    case "header":
      return !!headers?.[redirect.key.toLowerCase()] && new RegExp(redirect.value ?? "").test(headers[redirect.key.toLowerCase()] ?? "");
    case "cookie":
      return !!cookies?.[redirect.key] && new RegExp(redirect.value ?? "").test(cookies[redirect.key] ?? "");
    case "query":
      return query[redirect.key] && Array.isArray(redirect.value) ? redirect.value.reduce((prev, current) => prev || new RegExp(current).test(query[redirect.key]), false) : new RegExp(redirect.value ?? "").test(query[redirect.key] ?? "");
    case "host":
      return headers?.host !== "" && new RegExp(redirect.value ?? "").test(headers.host);
    default:
      return false;
  }
};
function checkHas(matcher, has, inverted = false) {
  return has ? has.reduce((acc, cur) => {
    if (acc === false)
      return false;
    return inverted ? !matcher(cur) : matcher(cur);
  }, true) : true;
}
var getParamsFromSource = (source) => (value) => {
  debug("value", value);
  const _match = source(value);
  return _match ? _match.params : {};
};
var computeParamHas = (headers, cookies, query) => (has) => {
  if (!has.value)
    return {};
  const matcher = new RegExp(`^${has.value}$`);
  const fromSource = (value) => {
    const matches = value.match(matcher);
    return matches?.groups ?? {};
  };
  switch (has.type) {
    case "header":
      return fromSource(headers[has.key.toLowerCase()] ?? "");
    case "cookie":
      return fromSource(cookies[has.key] ?? "");
    case "query":
      return Array.isArray(query[has.key]) ? fromSource(query[has.key].join(",")) : fromSource(query[has.key] ?? "");
    case "host":
      return fromSource(headers.host ?? "");
  }
};
function convertMatch(match2, toDestination, destination) {
  if (!match2) {
    return destination;
  }
  const { params } = match2;
  const isUsingParams = Object.keys(params).length > 0;
  return isUsingParams ? toDestination(params) : destination;
}
function getNextConfigHeaders(event, configHeaders) {
  if (!configHeaders) {
    return {};
  }
  const matcher = routeHasMatcher(event.headers, event.cookies, event.query);
  const requestHeaders = {};
  const localizedRawPath = localizePath(event);
  for (const { headers, has, missing, regex, source, locale } of configHeaders) {
    const path3 = locale === false ? event.rawPath : localizedRawPath;
    if (new RegExp(regex).test(path3) && checkHas(matcher, has) && checkHas(matcher, missing, true)) {
      const fromSource = match(source);
      const _match = fromSource(path3);
      headers.forEach((h) => {
        try {
          const key = convertMatch(_match, compile(h.key), h.key);
          const value = convertMatch(_match, compile(h.value), h.value);
          requestHeaders[key] = value;
        } catch {
          debug(`Error matching header ${h.key} with value ${h.value}`);
          requestHeaders[h.key] = h.value;
        }
      });
    }
  }
  return requestHeaders;
}
function handleRewrites(event, rewrites) {
  const { rawPath, headers, query, cookies, url } = event;
  const localizedRawPath = localizePath(event);
  const matcher = routeHasMatcher(headers, cookies, query);
  const computeHas = computeParamHas(headers, cookies, query);
  const rewrite = rewrites.find((route) => {
    const path3 = route.locale === false ? rawPath : localizedRawPath;
    return new RegExp(route.regex).test(path3) && checkHas(matcher, route.has) && checkHas(matcher, route.missing, true);
  });
  let finalQuery = query;
  let rewrittenUrl = url;
  const isExternalRewrite = isExternal(rewrite?.destination);
  debug("isExternalRewrite", isExternalRewrite);
  if (rewrite) {
    const { pathname, protocol, hostname, queryString } = getUrlParts(rewrite.destination, isExternalRewrite);
    const pathToUse = rewrite.locale === false ? rawPath : localizedRawPath;
    debug("urlParts", { pathname, protocol, hostname, queryString });
    const toDestinationPath = compile(escapeRegex(pathname, { isPath: true }));
    const toDestinationHost = compile(escapeRegex(hostname));
    const toDestinationQuery = compile(escapeRegex(queryString));
    const params = {
      // params for the source
      ...getParamsFromSource(match(escapeRegex(rewrite.source, { isPath: true })))(pathToUse),
      // params for the has
      ...rewrite.has?.reduce((acc, cur) => {
        return Object.assign(acc, computeHas(cur));
      }, {}),
      // params for the missing
      ...rewrite.missing?.reduce((acc, cur) => {
        return Object.assign(acc, computeHas(cur));
      }, {})
    };
    const isUsingParams = Object.keys(params).length > 0;
    let rewrittenQuery = queryString;
    let rewrittenHost = hostname;
    let rewrittenPath = pathname;
    if (isUsingParams) {
      rewrittenPath = unescapeRegex(toDestinationPath(params));
      rewrittenHost = unescapeRegex(toDestinationHost(params));
      rewrittenQuery = unescapeRegex(toDestinationQuery(params));
    }
    if (NextConfig.i18n && !isExternalRewrite) {
      const strippedPathLocale = rewrittenPath.replace(new RegExp(`^/(${NextConfig.i18n.locales.join("|")})`), "");
      if (strippedPathLocale.startsWith("/api/")) {
        rewrittenPath = strippedPathLocale;
      }
    }
    rewrittenUrl = isExternalRewrite ? `${protocol}//${rewrittenHost}${rewrittenPath}` : new URL(rewrittenPath, event.url).href;
    finalQuery = {
      ...query,
      ...convertFromQueryString(rewrittenQuery)
    };
    rewrittenUrl += convertToQueryString(finalQuery);
    debug("rewrittenUrl", { rewrittenUrl, finalQuery, isUsingParams });
  }
  return {
    internalEvent: {
      ...event,
      query: finalQuery,
      rawPath: new URL(rewrittenUrl).pathname,
      url: rewrittenUrl
    },
    __rewrite: rewrite,
    isExternalRewrite
  };
}
function handleRepeatedSlashRedirect(event) {
  if (event.rawPath.match(/(\\|\/\/)/)) {
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: normalizeRepeatedSlashes(new URL(event.url))
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
  return false;
}
function handleTrailingSlashRedirect(event) {
  const url = new URL(event.rawPath, "http://localhost");
  if (
    // Someone is trying to redirect to a different origin, let's not do that
    url.host !== "localhost" || NextConfig.skipTrailingSlashRedirect || // We should not apply trailing slash redirect to API routes
    event.rawPath.startsWith("/api/")
  ) {
    return false;
  }
  const emptyBody = emptyReadableStream();
  if (NextConfig.trailingSlash && !event.headers["x-nextjs-data"] && !event.rawPath.endsWith("/") && !event.rawPath.match(/[\w-]+\.[\w]+$/g)) {
    const headersLocation = event.url.split("?");
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: `${headersLocation[0]}/${headersLocation[1] ? `?${headersLocation[1]}` : ""}`
      },
      body: emptyBody,
      isBase64Encoded: false
    };
  }
  if (!NextConfig.trailingSlash && event.rawPath.endsWith("/") && event.rawPath !== "/") {
    const headersLocation = event.url.split("?");
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: `${headersLocation[0].replace(/\/$/, "")}${headersLocation[1] ? `?${headersLocation[1]}` : ""}`
      },
      body: emptyBody,
      isBase64Encoded: false
    };
  }
  return false;
}
function handleRedirects(event, redirects) {
  const repeatedSlashRedirect = handleRepeatedSlashRedirect(event);
  if (repeatedSlashRedirect)
    return repeatedSlashRedirect;
  const trailingSlashRedirect = handleTrailingSlashRedirect(event);
  if (trailingSlashRedirect)
    return trailingSlashRedirect;
  const localeRedirect = handleLocaleRedirect(event);
  if (localeRedirect)
    return localeRedirect;
  const { internalEvent, __rewrite } = handleRewrites(event, redirects.filter((r) => !r.internal));
  if (__rewrite && !__rewrite.internal) {
    return {
      type: event.type,
      statusCode: __rewrite.statusCode ?? 308,
      headers: {
        Location: internalEvent.url
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
}
function fixDataPage(internalEvent, buildId) {
  const { rawPath, query } = internalEvent;
  const basePath = NextConfig.basePath ?? "";
  const dataPattern = `${basePath}/_next/data/${buildId}`;
  if (rawPath.startsWith("/_next/data") && !rawPath.startsWith(dataPattern)) {
    return {
      type: internalEvent.type,
      statusCode: 404,
      body: toReadableStream("{}"),
      headers: {
        "Content-Type": "application/json"
      },
      isBase64Encoded: false
    };
  }
  if (rawPath.startsWith(dataPattern) && rawPath.endsWith(".json")) {
    const newPath = `${basePath}${rawPath.slice(dataPattern.length, -".json".length).replace(/^\/index$/, "/")}`;
    query.__nextDataReq = "1";
    return {
      ...internalEvent,
      rawPath: newPath,
      query,
      url: new URL(`${newPath}${convertToQueryString(query)}`, internalEvent.url).href
    };
  }
  return internalEvent;
}
function handleFallbackFalse(internalEvent, prerenderManifest) {
  const { rawPath } = internalEvent;
  const { dynamicRoutes = {}, routes = {} } = prerenderManifest ?? {};
  const prerenderedFallbackRoutes = Object.entries(dynamicRoutes).filter(([, { fallback }]) => fallback === false);
  const routeFallback = prerenderedFallbackRoutes.some(([, { routeRegex }]) => {
    const routeRegexExp = new RegExp(routeRegex);
    return routeRegexExp.test(rawPath);
  });
  const locales = NextConfig.i18n?.locales;
  const routesAlreadyHaveLocale = locales?.includes(rawPath.split("/")[1]) || // If we don't use locales, we don't need to add the default locale
  locales === void 0;
  let localizedPath = routesAlreadyHaveLocale ? rawPath : `/${NextConfig.i18n?.defaultLocale}${rawPath}`;
  if (
    // Not if localizedPath is "/" tho, because that would not make it find `isPregenerated` below since it would be try to match an empty string.
    localizedPath !== "/" && NextConfig.trailingSlash && localizedPath.endsWith("/")
  ) {
    localizedPath = localizedPath.slice(0, -1);
  }
  const matchedStaticRoute = staticRouteMatcher(localizedPath);
  const prerenderedFallbackRoutesName = prerenderedFallbackRoutes.map(([name]) => name);
  const matchedDynamicRoute = dynamicRouteMatcher(localizedPath).filter(({ route }) => !prerenderedFallbackRoutesName.includes(route));
  const isPregenerated = Object.keys(routes).includes(localizedPath);
  if (routeFallback && !isPregenerated && matchedStaticRoute.length === 0 && matchedDynamicRoute.length === 0) {
    return {
      event: {
        ...internalEvent,
        rawPath: "/404",
        url: constructNextUrl(internalEvent.url, "/404"),
        headers: {
          ...internalEvent.headers,
          "x-invoke-status": "404"
        }
      },
      isISR: false
    };
  }
  return {
    event: internalEvent,
    isISR: routeFallback || isPregenerated
  };
}

// ../../node_modules/@opennextjs/aws/dist/core/routing/middleware.js
init_stream();
init_utils();
var middlewareManifest = MiddlewareManifest;
var functionsConfigManifest = FunctionsConfigManifest;
var middleMatch = getMiddlewareMatch(middlewareManifest, functionsConfigManifest);
var REDIRECTS = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
function defaultMiddlewareLoader() {
  return Promise.resolve().then(() => (init_edgeFunctionHandler(), edgeFunctionHandler_exports));
}
async function handleMiddleware(internalEvent, initialSearch, middlewareLoader = defaultMiddlewareLoader) {
  const headers = internalEvent.headers;
  if (headers["x-isr"] && headers["x-prerender-revalidate"] === PrerenderManifest?.preview?.previewModeId)
    return internalEvent;
  const normalizedPath = localizePath(internalEvent);
  const hasMatch = middleMatch.some((r) => r.test(normalizedPath));
  if (!hasMatch)
    return internalEvent;
  const initialUrl = new URL(normalizedPath, internalEvent.url);
  initialUrl.search = initialSearch;
  const url = initialUrl.href;
  const middleware = await middlewareLoader();
  const result = await middleware.default({
    // `geo` is pre Next 15.
    geo: {
      // The city name is percent-encoded.
      // See https://github.com/vercel/vercel/blob/4cb6143/packages/functions/src/headers.ts#L94C19-L94C37
      city: decodeURIComponent(headers["x-open-next-city"]),
      country: headers["x-open-next-country"],
      region: headers["x-open-next-region"],
      latitude: headers["x-open-next-latitude"],
      longitude: headers["x-open-next-longitude"]
    },
    headers,
    method: internalEvent.method || "GET",
    nextConfig: {
      basePath: NextConfig.basePath,
      i18n: NextConfig.i18n,
      trailingSlash: NextConfig.trailingSlash
    },
    url,
    body: convertBodyToReadableStream(internalEvent.method, internalEvent.body)
  });
  const statusCode = result.status;
  const responseHeaders = result.headers;
  const reqHeaders = {};
  const resHeaders = {};
  const filteredHeaders = [
    "x-middleware-override-headers",
    "x-middleware-next",
    "x-middleware-rewrite",
    // We need to drop `content-encoding` because it will be decoded
    "content-encoding"
  ];
  const xMiddlewareKey = "x-middleware-request-";
  responseHeaders.forEach((value, key) => {
    if (key.startsWith(xMiddlewareKey)) {
      const k = key.substring(xMiddlewareKey.length);
      reqHeaders[k] = value;
    } else {
      if (filteredHeaders.includes(key.toLowerCase()))
        return;
      if (key.toLowerCase() === "set-cookie") {
        resHeaders[key] = resHeaders[key] ? [...resHeaders[key], value] : [value];
      } else if (REDIRECTS.has(statusCode) && key.toLowerCase() === "location") {
        resHeaders[key] = normalizeLocationHeader(value, internalEvent.url);
      } else {
        resHeaders[key] = value;
      }
    }
  });
  const rewriteUrl = responseHeaders.get("x-middleware-rewrite");
  let isExternalRewrite = false;
  let middlewareQuery = internalEvent.query;
  let newUrl = internalEvent.url;
  if (rewriteUrl) {
    newUrl = rewriteUrl;
    if (isExternal(newUrl, internalEvent.headers.host)) {
      isExternalRewrite = true;
    } else {
      const rewriteUrlObject = new URL(rewriteUrl);
      middlewareQuery = getQueryFromSearchParams(rewriteUrlObject.searchParams);
      if ("__nextDataReq" in internalEvent.query) {
        middlewareQuery.__nextDataReq = internalEvent.query.__nextDataReq;
      }
    }
  }
  if (!rewriteUrl && !responseHeaders.get("x-middleware-next")) {
    const body = result.body ?? emptyReadableStream();
    return {
      type: internalEvent.type,
      statusCode,
      headers: resHeaders,
      body,
      isBase64Encoded: false
    };
  }
  return {
    responseHeaders: resHeaders,
    url: newUrl,
    rawPath: new URL(newUrl).pathname,
    type: internalEvent.type,
    headers: { ...internalEvent.headers, ...reqHeaders },
    body: internalEvent.body,
    method: internalEvent.method,
    query: middlewareQuery,
    cookies: internalEvent.cookies,
    remoteAddress: internalEvent.remoteAddress,
    isExternalRewrite,
    rewriteStatusCode: rewriteUrl && !isExternalRewrite ? statusCode : void 0
  };
}

// ../../node_modules/@opennextjs/aws/dist/core/routingHandler.js
var MIDDLEWARE_HEADER_PREFIX = "x-middleware-response-";
var MIDDLEWARE_HEADER_PREFIX_LEN = MIDDLEWARE_HEADER_PREFIX.length;
var INTERNAL_HEADER_PREFIX = "x-opennext-";
var INTERNAL_HEADER_INITIAL_URL = `${INTERNAL_HEADER_PREFIX}initial-url`;
var INTERNAL_HEADER_LOCALE = `${INTERNAL_HEADER_PREFIX}locale`;
var INTERNAL_HEADER_RESOLVED_ROUTES = `${INTERNAL_HEADER_PREFIX}resolved-routes`;
var INTERNAL_HEADER_REWRITE_STATUS_CODE = `${INTERNAL_HEADER_PREFIX}rewrite-status-code`;
var INTERNAL_EVENT_REQUEST_ID = `${INTERNAL_HEADER_PREFIX}request-id`;
var geoHeaderToNextHeader = {
  "x-open-next-city": "x-vercel-ip-city",
  "x-open-next-country": "x-vercel-ip-country",
  "x-open-next-region": "x-vercel-ip-country-region",
  "x-open-next-latitude": "x-vercel-ip-latitude",
  "x-open-next-longitude": "x-vercel-ip-longitude"
};
function applyMiddlewareHeaders(eventOrResult, middlewareHeaders) {
  const isResult = isInternalResult(eventOrResult);
  const headers = eventOrResult.headers;
  const keyPrefix = isResult ? "" : MIDDLEWARE_HEADER_PREFIX;
  Object.entries(middlewareHeaders).forEach(([key, value]) => {
    if (value) {
      headers[keyPrefix + key] = Array.isArray(value) ? value.join(",") : value;
    }
  });
}
async function routingHandler(event, { assetResolver }) {
  try {
    for (const [openNextGeoName, nextGeoName] of Object.entries(geoHeaderToNextHeader)) {
      const value = event.headers[openNextGeoName];
      if (value) {
        event.headers[nextGeoName] = value;
      }
    }
    for (const key of Object.keys(event.headers)) {
      if (key.startsWith(INTERNAL_HEADER_PREFIX) || key.startsWith(MIDDLEWARE_HEADER_PREFIX)) {
        delete event.headers[key];
      }
    }
    let headers = getNextConfigHeaders(event, ConfigHeaders);
    let eventOrResult = fixDataPage(event, BuildId);
    if (isInternalResult(eventOrResult)) {
      return eventOrResult;
    }
    const redirect = handleRedirects(eventOrResult, RoutesManifest.redirects);
    if (redirect) {
      redirect.headers.Location = normalizeLocationHeader(redirect.headers.Location, event.url, true);
      debug("redirect", redirect);
      return redirect;
    }
    const middlewareEventOrResult = await handleMiddleware(
      eventOrResult,
      // We need to pass the initial search without any decoding
      // TODO: we'd need to refactor InternalEvent to include the initial querystring directly
      // Should be done in another PR because it is a breaking change
      new URL(event.url).search
    );
    if (isInternalResult(middlewareEventOrResult)) {
      return middlewareEventOrResult;
    }
    const middlewareHeadersPrioritized = globalThis.openNextConfig.dangerous?.middlewareHeadersOverrideNextConfigHeaders ?? false;
    if (middlewareHeadersPrioritized) {
      headers = {
        ...headers,
        ...middlewareEventOrResult.responseHeaders
      };
    } else {
      headers = {
        ...middlewareEventOrResult.responseHeaders,
        ...headers
      };
    }
    let isExternalRewrite = middlewareEventOrResult.isExternalRewrite ?? false;
    eventOrResult = middlewareEventOrResult;
    if (!isExternalRewrite) {
      const beforeRewrite = handleRewrites(eventOrResult, RoutesManifest.rewrites.beforeFiles);
      eventOrResult = beforeRewrite.internalEvent;
      isExternalRewrite = beforeRewrite.isExternalRewrite;
      if (!isExternalRewrite) {
        const assetResult = await assetResolver?.maybeGetAssetResult?.(eventOrResult);
        if (assetResult) {
          applyMiddlewareHeaders(assetResult, headers);
          return assetResult;
        }
      }
    }
    const foundStaticRoute = staticRouteMatcher(eventOrResult.rawPath);
    const isStaticRoute = !isExternalRewrite && foundStaticRoute.length > 0;
    if (!(isStaticRoute || isExternalRewrite)) {
      const afterRewrite = handleRewrites(eventOrResult, RoutesManifest.rewrites.afterFiles);
      eventOrResult = afterRewrite.internalEvent;
      isExternalRewrite = afterRewrite.isExternalRewrite;
    }
    let isISR = false;
    if (!isExternalRewrite) {
      const fallbackResult = handleFallbackFalse(eventOrResult, PrerenderManifest);
      eventOrResult = fallbackResult.event;
      isISR = fallbackResult.isISR;
    }
    const foundDynamicRoute = dynamicRouteMatcher(eventOrResult.rawPath);
    const isDynamicRoute = !isExternalRewrite && foundDynamicRoute.length > 0;
    if (!(isDynamicRoute || isStaticRoute || isExternalRewrite)) {
      const fallbackRewrites = handleRewrites(eventOrResult, RoutesManifest.rewrites.fallback);
      eventOrResult = fallbackRewrites.internalEvent;
      isExternalRewrite = fallbackRewrites.isExternalRewrite;
    }
    const isNextImageRoute = eventOrResult.rawPath.startsWith("/_next/image");
    const isRouteFoundBeforeAllRewrites = isStaticRoute || isDynamicRoute || isExternalRewrite;
    if (!(isRouteFoundBeforeAllRewrites || isNextImageRoute || // We need to check again once all rewrites have been applied
    staticRouteMatcher(eventOrResult.rawPath).length > 0 || dynamicRouteMatcher(eventOrResult.rawPath).length > 0)) {
      eventOrResult = {
        ...eventOrResult,
        rawPath: "/404",
        url: constructNextUrl(eventOrResult.url, "/404"),
        headers: {
          ...eventOrResult.headers,
          "x-middleware-response-cache-control": "private, no-cache, no-store, max-age=0, must-revalidate"
        }
      };
    }
    if (globalThis.openNextConfig.dangerous?.enableCacheInterception && !isInternalResult(eventOrResult)) {
      debug("Cache interception enabled");
      eventOrResult = await cacheInterceptor(eventOrResult);
      if (isInternalResult(eventOrResult)) {
        applyMiddlewareHeaders(eventOrResult, headers);
        return eventOrResult;
      }
    }
    applyMiddlewareHeaders(eventOrResult, headers);
    const resolvedRoutes = [
      ...foundStaticRoute,
      ...foundDynamicRoute
    ];
    debug("resolvedRoutes", resolvedRoutes);
    return {
      internalEvent: eventOrResult,
      isExternalRewrite,
      origin: false,
      isISR,
      resolvedRoutes,
      initialURL: event.url,
      locale: NextConfig.i18n ? detectLocale(eventOrResult, NextConfig.i18n) : void 0,
      rewriteStatusCode: middlewareEventOrResult.rewriteStatusCode
    };
  } catch (e) {
    error("Error in routingHandler", e);
    return {
      internalEvent: {
        type: "core",
        method: "GET",
        rawPath: "/500",
        url: constructNextUrl(event.url, "/500"),
        headers: {
          ...event.headers
        },
        query: event.query,
        cookies: event.cookies,
        remoteAddress: event.remoteAddress
      },
      isExternalRewrite: false,
      origin: false,
      isISR: false,
      resolvedRoutes: [],
      initialURL: event.url,
      locale: NextConfig.i18n ? detectLocale(event, NextConfig.i18n) : void 0
    };
  }
}
function isInternalResult(eventOrResult) {
  return eventOrResult != null && "statusCode" in eventOrResult;
}

// ../../node_modules/@opennextjs/aws/dist/adapters/middleware.js
globalThis.internalFetch = fetch;
globalThis.__openNextAls = new AsyncLocalStorage();
var defaultHandler = async (internalEvent, options) => {
  const middlewareConfig = globalThis.openNextConfig.middleware;
  const originResolver = await resolveOriginResolver(middlewareConfig?.originResolver);
  const externalRequestProxy = await resolveProxyRequest(middlewareConfig?.override?.proxyExternalRequest);
  const assetResolver = await resolveAssetResolver(middlewareConfig?.assetResolver);
  const requestId = Math.random().toString(36);
  return runWithOpenNextRequestContext({
    isISRRevalidation: internalEvent.headers["x-isr"] === "1",
    waitUntil: options?.waitUntil,
    requestId
  }, async () => {
    const result = await routingHandler(internalEvent, { assetResolver });
    if ("internalEvent" in result) {
      debug("Middleware intercepted event", internalEvent);
      if (!result.isExternalRewrite) {
        const origin = await originResolver.resolve(result.internalEvent.rawPath);
        return {
          type: "middleware",
          internalEvent: {
            ...result.internalEvent,
            headers: {
              ...result.internalEvent.headers,
              [INTERNAL_HEADER_INITIAL_URL]: internalEvent.url,
              [INTERNAL_HEADER_RESOLVED_ROUTES]: JSON.stringify(result.resolvedRoutes),
              [INTERNAL_EVENT_REQUEST_ID]: requestId,
              [INTERNAL_HEADER_REWRITE_STATUS_CODE]: String(result.rewriteStatusCode)
            }
          },
          isExternalRewrite: result.isExternalRewrite,
          origin,
          isISR: result.isISR,
          initialURL: result.initialURL,
          resolvedRoutes: result.resolvedRoutes
        };
      }
      try {
        return externalRequestProxy.proxy(result.internalEvent);
      } catch (e) {
        error("External request failed.", e);
        return {
          type: "middleware",
          internalEvent: {
            ...result.internalEvent,
            headers: {
              ...result.internalEvent.headers,
              [INTERNAL_EVENT_REQUEST_ID]: requestId
            },
            rawPath: "/500",
            url: constructNextUrl(result.internalEvent.url, "/500"),
            method: "GET"
          },
          // On error we need to rewrite to the 500 page which is an internal rewrite
          isExternalRewrite: false,
          origin: false,
          isISR: result.isISR,
          initialURL: result.internalEvent.url,
          resolvedRoutes: [{ route: "/500", type: "page" }]
        };
      }
    }
    if (process.env.OPEN_NEXT_REQUEST_ID_HEADER || globalThis.openNextDebug) {
      result.headers[INTERNAL_EVENT_REQUEST_ID] = requestId;
    }
    debug("Middleware response", result);
    return result;
  });
};
var handler2 = await createGenericHandler({
  handler: defaultHandler,
  type: "middleware"
});
var middleware_default = {
  fetch: handler2
};
export {
  middleware_default as default,
  handler2 as handler
};
