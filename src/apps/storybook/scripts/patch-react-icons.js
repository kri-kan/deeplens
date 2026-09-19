const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const libDir = path.join(rootDir, 'node_modules', 'react-icons', 'lib');

if (!fs.existsSync(libDir)) {
  console.log('[patch-react-icons] react-icons not found, skipping patch.');
  process.exit(0);
}

const iconBaseMjs = `var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
import React from "react";
import { Platform } from "react-native";
import * as SvgModule from "react-native-svg";
import { IconContext, DefaultContext } from "./iconContext.mjs";

const TAG_MAP = {
  svg: SvgModule.Svg || SvgModule.default,
  path: SvgModule.Path,
  circle: SvgModule.Circle,
  rect: SvgModule.Rect,
  line: SvgModule.Line,
  polyline: SvgModule.Polyline,
  polygon: SvgModule.Polygon,
  g: SvgModule.G,
  defs: SvgModule.Defs,
  clippath: SvgModule.ClipPath,
  lineargradient: SvgModule.LinearGradient,
  radialgradient: SvgModule.RadialGradient,
  stop: SvgModule.Stop,
  ellipse: SvgModule.Ellipse,
  text: SvgModule.Text,
  tspan: SvgModule.TSpan,
  mask: SvgModule.Mask,
  image: SvgModule.Image,
};

function Tree2Element(tree) {
  const isWeb = Platform.OS === 'web';
  return tree && tree.map((node, i) => {
    const Tag = (!isWeb && node.tag && TAG_MAP[node.tag.toLowerCase()]) || node.tag;
    return /*#__PURE__*/React.createElement(Tag, _objectSpread({
      key: i
    }, node.attr), Tree2Element(node.child));
  });
}

export function GenIcon(data) {
  return props => /*#__PURE__*/React.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}

export function IconBase(props) {
  var elem = conf => {
    var attr = props.attr,
      size = props.size,
      title = props.title,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;

    if (Platform.OS !== 'web') {
      const SvgComp = SvgModule.Svg || SvgModule.default;
      const numSize = typeof computedSize === 'number'
        ? computedSize
        : (typeof computedSize === 'string' && !computedSize.endsWith('%') ? parseFloat(computedSize) : undefined) || 24;
      const finalColor = props.color || conf.color || '#333333';
      const cleanProps = _objectSpread(_objectSpread(_objectSpread({}, conf.attr), attr), svgProps);
      delete cleanProps.xmlns;
      delete cleanProps.xmlnsXlink;
      delete cleanProps.className;

      const strokeVal = cleanProps.stroke === 'currentColor'
        ? finalColor
        : (cleanProps.stroke || (cleanProps.fill && cleanProps.fill !== 'none' ? undefined : finalColor));
      const fillVal = cleanProps.fill === 'currentColor'
        ? finalColor
        : (cleanProps.fill || 'none');

      return /*#__PURE__*/React.createElement(SvgComp, _extends({
        width: numSize,
        height: numSize,
        color: finalColor
      }, cleanProps, {
        stroke: strokeVal,
        fill: fillVal,
        style: [conf.style, props.style]
      }), props.children);
    }

    return /*#__PURE__*/React.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/React.createElement("title", null, title), props.children);
  };
  return IconContext !== undefined ? /*#__PURE__*/React.createElement(IconContext.Consumer, null, conf => elem(conf)) : elem(DefaultContext);
}
`;

const iconBaseJs = `"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GenIcon = GenIcon;
exports.IconBase = IconBase;
var _react = _interopRequireDefault(require("react"));
var _reactNative = require("react-native");
var _reactNativeSvg = _interopRequireWildcard(require("react-native-svg"));
var _iconContext = require("./iconContext");
var _excluded = ["attr", "size", "title"];
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }

var TAG_MAP = {
  svg: _reactNativeSvg.Svg || _reactNativeSvg.default,
  path: _reactNativeSvg.Path,
  circle: _reactNativeSvg.Circle,
  rect: _reactNativeSvg.Rect,
  line: _reactNativeSvg.Line,
  polyline: _reactNativeSvg.Polyline,
  polygon: _reactNativeSvg.Polygon,
  g: _reactNativeSvg.G,
  defs: _reactNativeSvg.Defs,
  clippath: _reactNativeSvg.ClipPath,
  lineargradient: _reactNativeSvg.LinearGradient,
  radialgradient: _reactNativeSvg.RadialGradient,
  stop: _reactNativeSvg.Stop,
  ellipse: _reactNativeSvg.Ellipse,
  text: _reactNativeSvg.Text,
  tspan: _reactNativeSvg.TSpan,
  mask: _reactNativeSvg.Mask,
  image: _reactNativeSvg.Image
};

function Tree2Element(tree) {
  var isWeb = _reactNative.Platform.OS === 'web';
  return tree && tree.map((node, i) => {
    var Tag = (!isWeb && node.tag && TAG_MAP[node.tag.toLowerCase()]) || node.tag;
    return /*#__PURE__*/_react.default.createElement(Tag, _objectSpread({
      key: i
    }, node.attr), Tree2Element(node.child));
  });
}
function GenIcon(data) {
  return props => /*#__PURE__*/_react.default.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = conf => {
    var attr = props.attr,
      size = props.size,
      title = props.title,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;

    if (_reactNative.Platform.OS !== 'web') {
      var SvgComp = _reactNativeSvg.Svg || _reactNativeSvg.default;
      var numSize = typeof computedSize === 'number'
        ? computedSize
        : (typeof computedSize === 'string' && !computedSize.endsWith('%') ? parseFloat(computedSize) : undefined) || 24;
      var finalColor = props.color || conf.color || '#333333';
      var cleanProps = _objectSpread(_objectSpread(_objectSpread({}, conf.attr), attr), svgProps);
      delete cleanProps.xmlns;
      delete cleanProps.xmlnsXlink;
      delete cleanProps.className;

      var strokeVal = cleanProps.stroke === 'currentColor'
        ? finalColor
        : (cleanProps.stroke || (cleanProps.fill && cleanProps.fill !== 'none' ? undefined : finalColor));
      var fillVal = cleanProps.fill === 'currentColor'
        ? finalColor
        : (cleanProps.fill || 'none');

      return /*#__PURE__*/_react.default.createElement(SvgComp, _extends({
        width: numSize,
        height: numSize,
        color: finalColor
      }, cleanProps, {
        stroke: strokeVal,
        fill: fillVal,
        style: [conf.style, props.style]
      }), props.children);
    }

    return /*#__PURE__*/_react.default.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/_react.default.createElement("title", null, title), props.children);
  };
  return _iconContext.IconContext !== undefined ? /*#__PURE__*/_react.default.createElement(_iconContext.IconContext.Consumer, null, conf => elem(conf)) : elem(_iconContext.DefaultContext);
}
`;

fs.writeFileSync(path.join(libDir, 'iconBase.mjs'), iconBaseMjs, 'utf8');
fs.writeFileSync(path.join(libDir, 'iconBase.js'), iconBaseJs, 'utf8');
console.log('[patch-react-icons] Successfully patched react-icons for react-native-svg compatibility!');
