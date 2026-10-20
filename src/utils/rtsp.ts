/**
 * RTSP & IP Camera Stream Utilities for Local/Public Wi-Fi & Gateways
 */

export interface ParsedRtspUrl {
  isValid: boolean;
  rawUrl: string;
  sanitizedUrl: string;
  username: string;
  password?: string;
  host: string;
  port: number;
  path: string;
  channel: number;
  subtype: number; // 0 = mainstream (1080p/4k), 1 = substream (720p/D1)
  isLocalNetwork: boolean;
  cameraBrandGuess?: 'Hikvision' | 'Dahua' | 'CP Plus' | 'Uniview' | 'Generic ONVIF';
  snapshotUrlSuggestions: string[];
  go2rtcConfigSnippet: string;
  relayCliCommand: string;
  dockerRelayCommand: string;
}

/**
 * Parses RTSP URLs such as:
 * rtsp://admin:Nav1%402211@192.168.29.147:554/video/livechannel=1&subtype=0
 */
export function parseRtspUrl(url: string): ParsedRtspUrl {
  const trimmed = (url || '').trim();
  const defaultResult: ParsedRtspUrl = {
    isValid: false,
    rawUrl: trimmed,
    sanitizedUrl: trimmed,
    username: '',
    host: '',
    port: 554,
    path: '',
    channel: 1,
    subtype: 0,
    isLocalNetwork: false,
    snapshotUrlSuggestions: [],
    go2rtcConfigSnippet: '',
    relayCliCommand: '',
    dockerRelayCommand: '',
  };

  if (!trimmed.toLowerCase().startsWith('rtsp://')) {
    return defaultResult;
  }

  try {
    // Standard URL parser needs a supported scheme or replacement for parsing
    const urlObj = new URL(trimmed.replace(/^rtsp:\/\//i, 'http://'));
    const username = decodeURIComponent(urlObj.username || '');
    const password = decodeURIComponent(urlObj.password || '');
    const host = urlObj.hostname || '';
    const port = urlObj.port ? parseInt(urlObj.port, 10) : 554;
    const path = urlObj.pathname || '';
    const searchParams = urlObj.searchParams;

    // Detect Channel & Subtype
    let channel = 1;
    let subtype = 0;

    // Check query params (e.g., livechannel=1&subtype=0 or channel=1)
    if (searchParams.has('livechannel')) {
      channel = parseInt(searchParams.get('livechannel') || '1', 10);
    } else if (searchParams.has('channel')) {
      channel = parseInt(searchParams.get('channel') || '1', 10);
    }

    if (searchParams.has('subtype')) {
      subtype = parseInt(searchParams.get('subtype') || '0', 10);
    }

    // Check path for Hikvision / Dahua style (e.g. /Streaming/Channels/101 or /cam/realmonitor?channel=1&subtype=0)
    const chMatch = path.match(/channel[s]?\/(\d+)/i) || path.match(/(\d{3})/);
    if (chMatch && !searchParams.has('livechannel') && !searchParams.has('channel')) {
      const num = parseInt(chMatch[1], 10);
      if (num >= 100) {
        channel = Math.floor(num / 100);
        subtype = num % 100 === 1 ? 0 : 1;
      } else {
        channel = num;
      }
    }

    // Check if host is a local / private subnet IP
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host);

    // Guess brand based on path conventions
    let brand: ParsedRtspUrl['cameraBrandGuess'] = 'Generic ONVIF';
    if (path.includes('livechannel') || path.includes('/video/')) {
      brand = 'CP Plus';
    } else if (path.includes('ISAPI') || path.includes('Streaming/Channels')) {
      brand = 'Hikvision';
    } else if (path.includes('cam/realmonitor') || path.includes('cgi-bin')) {
      brand = 'Dahua';
    } else if (path.includes('media/video')) {
      brand = 'Uniview';
    }

    // Generate sanitized display URL
    const sanitizedUrl = password
      ? trimmed.replace(`:${urlObj.password}@`, ':••••••@')
      : trimmed;

    // Direct HTTP Snapshot suggestions
    const authPrefix = username && password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
    const snapshotSuggestions: string[] = [
      `http://${authPrefix}${host}/ISAPI/Streaming/channels/${channel}01/picture`, // Hikvision / CP Plus ISAPI
      `http://${authPrefix}${host}/cgi-bin/snapshot.cgi?channel=${channel}`, // Dahua / CP Plus CGI
      `http://${authPrefix}${host}/onvif/snapshot`, // Standard ONVIF
      `http://${authPrefix}${host}:80/snapshot.jpg`, // Generic IP Cam
    ];

    // go2rtc configuration block
    const go2rtcConfig = `streams:\n  table_${channel}_cam:\n    - ${trimmed}\n    - "ffmpeg:${trimmed}#video=copy"`;

    // 1-Click CLI relay commands
    const relayCli = `npx rtsp-relay --url "${trimmed}" --port 200${channel}`;
    const dockerRelay = `docker run --rm -it -e RTSP_URL="${trimmed}" -p 808${channel}:8080 aler9/mediamtx`;

    return {
      isValid: true,
      rawUrl: trimmed,
      sanitizedUrl,
      username,
      password,
      host,
      port,
      path,
      channel,
      subtype,
      isLocalNetwork: isLocal,
      cameraBrandGuess: brand,
      snapshotUrlSuggestions: snapshotSuggestions,
      go2rtcConfigSnippet: go2rtcConfig,
      relayCliCommand: relayCli,
      dockerRelayCommand: dockerRelay,
    };
  } catch {
    return defaultResult;
  }
}

/**
 * Creates optimal stream candidate URLs based on input URL
 */
export function getRecommendedStreamCandidates(url: string, tableId: number) {
  const parsed = parseRtspUrl(url);
  if (!parsed.isValid) {
    return {
      isRtsp: false,
      parsed: null,
      primaryUrl: url,
    };
  }

  return {
    isRtsp: true,
    parsed,
    primaryUrl: url,
    webrtcGatewayUrl: `http://${parsed.host || 'localhost'}:1984/stream.html?src=table_${tableId || parsed.channel}`,
    hlsUrl: `http://${parsed.host || 'localhost'}:8888/table_${tableId || parsed.channel}/index.m3u8`,
    mjpegUrl: parsed.snapshotUrlSuggestions[0],
  };
}
