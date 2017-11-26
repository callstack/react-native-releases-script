'use strict';

const base = '0.50-stable';
const compare = '0.51-stable';

function fetchJSON(host, path) {
  return new Promise((resolve, reject) => {
    let data = '';

    require('https')
      .get({
        host,
        path,
        headers: {
          'User-Agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)'
        }
      })
      .on('response', response => {
        response.on('data', chunk => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(e);
          }
        });

        response.on('error', error => {
          reject(error);
        });
      });
  });
}

function filterCICommits(commits) {
  return commits.filter(item => {
    const text = item.commit.message.toLowerCase();
    return !(
      text.includes('travis') ||
      text.includes('circleci') ||
      text.includes('circle ci')
    );
  });
}

function isBreaking(change) {
  return /\b(breaking)\b/i.test(change);
}

function isAndroidCommit(change) {
  return /\b(android|java)\b/i.test(change) || /android/i.test(change);
}

function isIOSCommit(change) {
  return (
    /\b(ios|xcode|swift|objective-c|iphone|ipad)\b/i.test(change) ||
    /ios\b/i.test(change) ||
    /\brct/i.test(change)
  );
}

function isBugFix(change) {
  return /\b(fix(es|ed|ing)?|crash|exception)\b/i.test(change);
}

function isNewFeature(change) {
  return /\b(feature|add(s|ed)?|introduc(e|ed|ing)?|implement(s|ed)?)\b/i.test(
    change
  );
}

function getChangeMessage(item) {
  return `* ${item.commit.message.split('\n')[0]} (${item.sha.slice(0, 7)}) ${
    item.author ? '- @' + item.author.login : ''
  }`;
}

function getChangelogDesc(commits) {
  const acc = {
    breaking: { android: [], ios: [], unknown: [] },
    android: { fix: [], feat: [], others: [] },
    ios: { fix: [], feat: [], others: [] },
    unknown: { fix: [], feat: [], others: [] }
  };

  commits.forEach(item => {
    const change = item.commit.message.split('\n')[0];
    const message = getChangeMessage(item);

    if (isBreaking(change)) {
      if (isAndroidCommit(change)) {
        acc.breaking.android.push(message);
      } else if (isIOSCommit(change)) {
        acc.breaking.ios.push(message);
      } else {
        acc.breaking.unknown.push(message);
      }
    } else if (isBugFix(change)) {
      if (isAndroidCommit(change)) {
        acc.android.fix.push(message);
      } else if (isIOSCommit(change)) {
        acc.ios.fix.push(message);
      } else {
        acc.unknown.fix.push(message);
      }
    } else if (isNewFeature(change)) {
      if (isAndroidCommit(change)) {
        acc.android.feat.push(message);
      } else if (isIOSCommit(change)) {
        acc.ios.feat.push(message);
      } else {
        acc.unknown.feat.push(message);
      }
    } else {
      if (isAndroidCommit(change)) {
        acc.android.others.push(message);
      } else if (isIOSCommit(change)) {
        acc.ios.others.push(message);
      } else {
        acc.unknown.others.push(message);
      }
    }
  });

  return acc;
}

function buildMarkDown(data) {
  return `
## Breaking changes

### Android

${data.breaking.android.join('\n')}

### iOS

${data.breaking.ios.join('\n')}

### Unknown

${data.breaking.unknown.join('\n')}


## Android

### Bugfixes

${data.android.fix.join('\n')}

### New features and enhancements

${data.android.feat.join('\n')}

### Others

${data.android.others.join('\n')}


## iOS

### Bugfixes

${data.ios.fix.join('\n')}

### New features and enhancements

${data.ios.feat.join('\n')}

### Others

${data.ios.others.join('\n')}


## Unknown

### Bugfixes

${data.unknown.fix.join('\n')}

### New features and enhancements

${data.unknown.feat.join('\n')}

### Others

${data.unknown.others.join('\n')}
`;
}

fetchJSON(
  'api.github.com',
  '/repos/facebook/react-native/compare/' + base + '...' + compare
)
  .then(data => data.commits)
  .then(filterCICommits)
  .then(getChangelogDesc)
  .then(buildMarkDown)
  .then(data => console.log(data))
  .catch(e => console.error(e));
