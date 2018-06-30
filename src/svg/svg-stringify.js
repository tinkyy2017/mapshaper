/* @require svg-common */

SVG.embedImages = function(obj, symbols) {
  // Same-origin policy is an obstacle to embedding images in web UI
  if (internal.runningInBrowser()) return;
  procNode(obj);

  function procNode(obj) {
    if (obj.tag == 'image') {
      if (/\.svg/.test(obj.properties.href || '')) {
        embedSvgImage(obj);
      }
    } else if (obj.children) {
      obj.children.forEach(procNode);
    }
  }

  function embedSvgImage(obj) {
    var id = addImage(obj.properties.href);
    obj.tag = 'use';
    obj.properties.href = '#' + id;
  }

  function addImage(href) {
    var item = utils.find(symbols, function(item) {return item.href == href;});
    if (!item) {
      item = {
        href: href,
        id: utils.getUniqueName()
      };
      item.svg = convertSvgToSymbol(getSvgFile(href), item.id) + '\n';
      symbols.push(item);
    }
    return item.id;
  }

  function convertSvgToSymbol(svg, id) {
    svg = svg.replace(/[^]*<svg/, '<svg'); // strip xml namespace
    svg = svg.replace(/<metadata[^]*?metadata>/, ''); // Inkscape metadata triggered an error in Chrome
    svg = svg.replace(/^<svg[^>]*>/, function(a) {
      var viewBox = a.match(/viewBox=".*?"/)[0];
      return '<symbol id="' + id + '" ' + viewBox + '>';
    });
    svg = svg.replace('svg>', 'symbol>');
    return svg;
  }

  function getSvgFile(href) {
    var request = require('sync-request');
    var res = request('GET', href, {timeout: 2000});
    var content = res.getBody();
    return content.toString();
  }

  /*
  // Switched to convertSvgToSymbol(). For this function to work, need to
  // add display:none inline style
  function convertSvg(svg, id) {
    svg = svg.replace(/[^]*<svg/, '<svg');
    return svg.replace(/^<svg[^>]*>/, function(a) {
      a = a.replace(/ id="[^"]*"/, '');
      a = a.replace(/<svg/, '<svg id="' + id + '"');
      return a;
    });
  };
  */
};

SVG.stringify = function(obj) {
  var svg = '<' + obj.tag;
  // w.s. is significant in text elements
  var joinStr = obj.tag == 'text' || obj.tag == 'tspan' ? '' : '\n';
  if (obj.properties) {
    svg += SVG.stringifyProperties(obj.properties);
  }
  if (obj.children || obj.value) {
    svg += '>' + joinStr;
    if (obj.value) {
      svg += obj.value;
    }
    if (obj.children) {
      svg += obj.children.map(SVG.stringify).join(joinStr);
    }
    svg += joinStr + '</' + obj.tag + '>';
  } else {
    svg += '/>';
  }
  return svg;
};

SVG.stringEscape = (function() {
  // See http://commons.oreilly.com/wiki/index.php/SVG_Essentials/The_XML_You_Need_for_SVG
  var rxp = /[&<>"']/g,
      map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
      };
  return function(s) {
    return String(s).replace(rxp, function(s) {
      return map[s];
    });
  };
}());

SVG.stringifyProperties = function(o) {
  return Object.keys(o).reduce(function(memo, key) {
    var val = o[key],
        strval;
    if (!val && val !== 0) return memo; // omit undefined / empty / null values
    strval = utils.isString(val) ? val : JSON.stringify(val);
    return memo + ' ' + key + '="' + SVG.stringEscape(strval) + '"';
  }, '');
};
