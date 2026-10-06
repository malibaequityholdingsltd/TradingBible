export function parseVAST(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid VAST XML: ' + parseError.textContent);
  }

  const ads = xmlDoc.querySelectorAll('Ad');
  const result = {
    version: xmlDoc.querySelector('VAST')?.getAttribute('version') || '4.0',
    ads: [],
  };

  for (const adNode of ads) {
    const ad = parseAd(adNode);
    if (ad) result.ads.push(ad);
  }

  return result;
}

function parseAd(adNode) {
  const id = adNode.getAttribute('id') || '';
  const sequence = adNode.getAttribute('sequence') || 1;

  const inLine = adNode.querySelector('InLine');
  const wrapper = adNode.querySelector('Wrapper');

  if (inLine) {
    return parseInLine(inLine, id, sequence);
  } else if (wrapper) {
    return parseWrapper(wrapper, id, sequence);
  }

  return null;
}

function parseInLine(inLineNode, id, sequence) {
  const adSystem = getText(inLineNode, 'AdSystem');
  const adTitle = getText(inLineNode, 'AdTitle');
  const description = getText(inLineNode, 'Description');
  const advertiser = getText(inLineNode, 'Advertiser');
  const survey = getText(inLineNode, 'Survey');
  const error = getText(inLineNode, 'Error');

  const impressions = [];
  for (const imp of inLineNode.querySelectorAll('Impression')) {
    impressions.push({
      url: imp.textContent?.trim() || '',
      id: imp.getAttribute('id') || '',
    });
  }

  const creatives = [];
  for (const creative of inLineNode.querySelectorAll('Creative')) {
    const creativeData = parseCreative(creative);
    if (creativeData) creatives.push(creativeData);
  }

  const extensions = parseExtensions(inLineNode.querySelector('Extensions'));

  return {
    id,
    sequence: Number(sequence),
    type: 'inline',
    adSystem,
    adTitle,
    description,
    advertiser,
    survey,
    error,
    impressions,
    creatives,
    extensions,
  };
}

function parseWrapper(wrapperNode, id, sequence) {
  const adSystem = getText(wrapperNode, 'AdSystem');
  const vastAdTagURI = getText(wrapperNode, 'VASTAdTagURI');
  const error = getText(wrapperNode, 'Error');

  const impressions = [];
  for (const imp of wrapperNode.querySelectorAll('Impression')) {
    impressions.push({
      url: imp.textContent?.trim() || '',
      id: imp.getAttribute('id') || '',
    });
  }

  const extensions = parseExtensions(wrapperNode.querySelector('Extensions'));

  return {
    id,
    sequence: Number(sequence),
    type: 'wrapper',
    adSystem,
    vastAdTagURI,
    error,
    impressions,
    extensions,
  };
}

function parseCreative(creativeNode) {
  const id = creativeNode.getAttribute('id') || '';
  const sequence = creativeNode.getAttribute('sequence') || 1;
  const adId = creativeNode.getAttribute('AdID') || '';

  const linear = creativeNode.querySelector('Linear');
  const nonLinear = creativeNode.querySelector('NonLinearAds');
  const companion = creativeNode.querySelector('CompanionAds');

  if (linear) {
    return { ...parseLinear(linear), id, sequence: Number(sequence), adId, type: 'linear' };
  } else if (nonLinear) {
    return { ...parseNonLinear(nonLinear), id, sequence: Number(sequence), adId, type: 'nonlinear' };
  } else if (companion) {
    return { ...parseCompanionAds(companion), id, sequence: Number(sequence), adId, type: 'companion' };
  }

  return null;
}

function parseLinear(linearNode) {
  const duration = getText(linearNode, 'Duration');
  const trackingEvents = parseTrackingEvents(linearNode.querySelector('TrackingEvents'));
  const videoClicks = parseVideoClicks(linearNode.querySelector('VideoClicks'));
  const mediaFiles = [];
  for (const mf of linearNode.querySelectorAll('MediaFile')) {
    mediaFiles.push({
      url: mf.textContent?.trim() || '',
      delivery: mf.getAttribute('delivery') || 'progressive',
      type: mf.getAttribute('type') || '',
      bitrate: Number(mf.getAttribute('bitrate') || 0),
      width: Number(mf.getAttribute('width') || 0),
      height: Number(mf.getAttribute('height') || 0),
      scalable: mf.getAttribute('scalable') === 'true',
      maintainAspectRatio: mf.getAttribute('maintainAspectRatio') !== 'false',
      codec: mf.getAttribute('codec') || '',
      apiFramework: mf.getAttribute('apiFramework') || '',
    });
  }

  const icons = parseIcons(linearNode.querySelector('Icons'));

  return {
    duration: parseDuration(duration),
    trackingEvents,
    videoClicks,
    mediaFiles,
    icons,
    skipOffset: linearNode.getAttribute('skipoffset') || null,
  };
}

function parseNonLinear(nonLinearNode) {
  const nonLinears = [];
  for (const nl of nonLinearNode.querySelectorAll('NonLinear')) {
    nonLinears.push({
      id: nl.getAttribute('id') || '',
      width: Number(nl.getAttribute('width') || 0),
      height: Number(nl.getAttribute('height') || 0),
      expandedWidth: Number(nl.getAttribute('expandedWidth') || 0),
      expandedHeight: Number(nl.getAttribute('expandedHeight') || 0),
      scalable: nl.getAttribute('scalable') === 'true',
      maintainAspectRatio: nl.getAttribute('maintainAspectRatio') !== 'false',
      minSuggestedDuration: parseDuration(nl.getAttribute('minSuggestedDuration') || ''),
      apiFramework: nl.getAttribute('apiFramework') || '',
      staticResource: getText(nl, 'StaticResource'),
      iframeResource: getText(nl, 'IFrameResource'),
      htmlResource: getText(nl, 'HTMLResource'),
      nonLinearClickThrough: getText(nl, 'NonLinearClickThrough'),
      nonLinearClickTracking: getText(nl, 'NonLinearClickTracking'),
    });
  }

  const trackingEvents = parseTrackingEvents(nonLinearNode.querySelector('TrackingEvents'));

  return { nonLinears, trackingEvents };
}

function parseCompanionAds(companionNode) {
  const companions = [];
  for (const comp of companionNode.querySelectorAll('Companion')) {
    companions.push({
      id: comp.getAttribute('id') || '',
      width: Number(comp.getAttribute('width') || 0),
      height: Number(comp.getAttribute('height') || 0),
      assetWidth: Number(comp.getAttribute('assetWidth') || 0),
      assetHeight: Number(comp.getAttribute('assetHeight') || 0),
      expandedWidth: Number(comp.getAttribute('expandedWidth') || 0),
      expandedHeight: Number(comp.getAttribute('expandedHeight') || 0),
      apiFramework: comp.getAttribute('apiFramework') || '',
      staticResource: getText(comp, 'StaticResource'),
      iframeResource: getText(comp, 'IFrameResource'),
      htmlResource: getText(comp, 'HTMLResource'),
      companionClickThrough: getText(comp, 'CompanionClickThrough'),
      companionClickTracking: getText(comp, 'CompanionClickTracking'),
      altText: getText(comp, 'AltText'),
      adParameters: getText(comp, 'AdParameters'),
    });
  }
  return { companions };
}

function parseTrackingEvents(trackingNode) {
  if (!trackingNode) return {};

  const events = {};
  const eventTypes = [
    'creativeView', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile',
    'complete', 'mute', 'unmute', 'pause', 'rewind', 'resume', 'fullscreen',
    'exitFullscreen', 'skip', 'progress', 'acceptInvitation', 'close',
    'collapse', 'expand'
  ];

  for (const eventType of eventTypes) {
    const urls = [];
    for (const node of trackingNode.querySelectorAll(`Tracking[event="${eventType}"]`)) {
      urls.push(node.textContent?.trim() || '');
    }
    if (urls.length > 0) events[eventType] = urls;
  }

  return events;
}

function parseVideoClicks(videoClicksNode) {
  if (!videoClicksNode) return {};

  return {
    clickThrough: getText(videoClicksNode, 'ClickThrough'),
    clickTracking: Array.from(videoClicksNode.querySelectorAll('ClickTracking')).map(n => n.textContent?.trim() || ''),
    customClick: Array.from(videoClicksNode.querySelectorAll('CustomClick')).map(n => ({
      id: n.getAttribute('id') || '',
      url: n.textContent?.trim() || '',
    })),
  };
}

function parseIcons(iconsNode) {
  if (!iconsNode) return [];

  return Array.from(iconsNode.querySelectorAll('Icon')).map(icon => ({
    id: icon.getAttribute('id') || '',
    width: Number(icon.getAttribute('width') || 0),
    height: Number(icon.getAttribute('height') || 0),
    xPosition: icon.getAttribute('xPosition') || 'left',
    yPosition: icon.getAttribute('yPosition') || 'top',
    offsetX: Number(icon.getAttribute('offsetX') || 0),
    offsetY: Number(icon.getAttribute('offsetY') || 0),
    duration: parseDuration(icon.getAttribute('duration') || ''),
    apiFramework: icon.getAttribute('apiFramework') || '',
    iconClickThrough: getText(icon, 'IconClickThrough'),
    iconViewTracking: Array.from(icon.querySelectorAll('IconViewTracking')).map(n => n.textContent?.trim() || ''),
    iconClickTracking: Array.from(icon.querySelectorAll('IconClickTracking')).map(n => n.textContent?.trim() || ''),
    staticResource: getText(icon, 'StaticResource'),
    iframeResource: getText(icon, 'IFrameResource'),
    htmlResource: getText(icon, 'HTMLResource'),
  }));
}

function parseExtensions(extensionsNode) {
  if (!extensionsNode) return {};
  const result = {};
  for (const child of extensionsNode.children) {
    result[child.tagName] = child.textContent?.trim() || '';
  }
  return result;
}

function getText(parent, tagName) {
  const node = parent?.querySelector(tagName);
  return node?.textContent?.trim() || '';
}

function parseDuration(durationStr) {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return Number(durationStr) || 0;
}

export function parseVMAP(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid VMAP XML: ' + parseError.textContent);
  }

  const vmap = xmlDoc.querySelector('vmap:VMAP') || xmlDoc.querySelector('VMAP');
  if (!vmap) throw new Error('No VMAP root element found');

  const version = vmap.getAttribute('version') || '1.0';
  const adBreaks = [];

  for (const adBreak of vmap.querySelectorAll('vmap:AdBreak, AdBreak')) {
    const breakData = parseAdBreak(adBreak);
    if (breakData) adBreaks.push(breakData);
  }

  const extensions = parseExtensions(vmap.querySelector('vmap:Extensions, Extensions'));

  return { version, adBreaks, extensions };
}

function parseAdBreak(adBreakNode) {
  const breakId = adBreakNode.getAttribute('breakId') || '';
  const breakType = adBreakNode.getAttribute('breakType') || 'linear';
  const timeOffset = adBreakNode.getAttribute('timeOffset') || 'start';

  const adSources = [];
  for (const source of adBreakNode.querySelectorAll('vmap:AdSource, AdSource')) {
    const id = source.getAttribute('id') || '';
    const allowMultiple = source.getAttribute('allowMultipleAds') === 'true';
    const followRedirects = source.getAttribute('followRedirects') !== 'false';

    const vastAdData = source.querySelector('vmap:VASTAdData, VASTAdData');
    const vastAdTagURI = source.querySelector('vmap:VASTAdTagURI, VASTAdTagURI');
    const customAdData = source.querySelector('vmap:CustomAdData, CustomAdData');

    let adData = null;
    if (vastAdData) {
      adData = { type: 'vast-inline', xml: vastAdData.outerHTML };
    } else if (vastAdTagURI) {
      adData = { type: 'vast-tag', url: vastAdTagURI.textContent?.trim() || '' };
    } else if (customAdData) {
      adData = { type: 'custom', data: customAdData.textContent?.trim() || '' };
    }

    if (adData) {
      adSources.push({ id, allowMultiple, followRedirects, ...adData });
    }
  }

  const trackingEvents = parseVmapTrackingEvents(adBreakNode.querySelector('vmap:TrackingEvents, TrackingEvents'));

  return { breakId, breakType, timeOffset, adSources, trackingEvents };
}

function parseVmapTrackingEvents(trackingNode) {
  if (!trackingNode) return {};

  const events = {};
  const eventTypes = ['breakStart', 'breakEnd', 'error'];

  for (const eventType of eventTypes) {
    const urls = [];
    for (const node of trackingNode.querySelectorAll(`Tracking[event="${eventType}"]`)) {
      urls.push(node.textContent?.trim() || '');
    }
    if (urls.length > 0) events[eventType] = urls;
  }

  return events;
}

export function selectBestMediaFile(mediaFiles, preferences = {}) {
  if (!mediaFiles || mediaFiles.length === 0) return null;

  const {
    preferredTypes = ['video/mp4', 'video/webm', 'application/x-mpegURL'],
    maxBitrate = Infinity,
    minBitrate = 0,
    maxWidth = Infinity,
    maxHeight = Infinity,
    delivery = 'progressive',
  } = preferences;

  let scored = mediaFiles
    .filter(mf => {
      if (maxBitrate !== Infinity && mf.bitrate > maxBitrate) return false;
      if (mf.bitrate < minBitrate) return false;
      if (mf.width > maxWidth) return false;
      if (mf.height > maxHeight) return false;
      if (delivery && mf.delivery !== delivery) return false;
      return true;
    })
    .map(mf => {
      const typeScore = preferredTypes.indexOf(mf.type);
      const bitrateScore = mf.bitrate || 0;
      return { ...mf, score: (typeScore >= 0 ? 1000 - typeScore * 100 : 0) + bitrateScore / 1000 };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0] || null;
}

export function createVASTAdResponse(ad) {
  return {
    vastXml: ad.vastXml || '',
    adId: ad.id,
    mediaFiles: ad.creatives
      .filter(c => c.type === 'linear')
      .flatMap(c => c.mediaFiles || [])
      .map(mf => ({
        url: mf.url,
        type: mf.type,
        bitrate: mf.bitrate,
        width: mf.width,
        height: mf.height,
      })),
    trackingUrls: ad.creatives
      .filter(c => c.type === 'linear')
      .flatMap(c => Object.entries(c.trackingEvents || {}))
      .reduce((acc, [event, urls]) => {
        acc[event] = [...(acc[event] || []), ...urls];
        return acc;
      }, {}),
    clickThrough: ad.creatives
      .filter(c => c.type === 'linear')
      .flatMap(c => c.videoClicks?.clickThrough || [])
      .filter(Boolean),
    clickTracking: ad.creatives
      .filter(c => c.type === 'linear')
      .flatMap(c => c.videoClicks?.clickTracking || [])
      .filter(Boolean),
    duration: Math.max(...ad.creatives
      .filter(c => c.type === 'linear')
      .map(c => c.duration || 0), 0),
    skipOffset: ad.creatives
      .filter(c => c.type === 'linear')
      .map(c => c.skipOffset)
      .find(s => s !== null) || null,
  };
}