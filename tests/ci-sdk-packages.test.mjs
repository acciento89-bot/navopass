import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const compileSdk = read('android/app/build.gradle.kts').match(/compileSdk\s*=\s*(\d+)/)?.[1];
for (const path of ['.github/workflows/android-ci.yml','.github/workflows/android-store-screenshots.yml']) {
  test(path+' explicitly installs supported SDK packages before Gradle',()=>{
    assert.equal(compileSdk,'36','Keep this policy bound to the actual pinned Android toolchain');
    const lines=read(path).split('\n');
    const start=lines.findIndex(line=>line.includes('uses: android-actions/setup-android@v3'));
    assert.ok(start>=0,'SDK setup step must remain present');
    let end=start+1;
    while(end<lines.length && !lines[end].startsWith('      - '))end++;
    const step=lines.slice(start,end).join('\n');
    const explicit=step.match(/^\s+packages:\s*['"]?([^'"\n]+)['"]?\s*$/m)?.[1];
    assert.ok(explicit,'Do not inherit setup-android default tools: sdkmanager cannot resolve that removed package');
    const packages=explicit.trim().split(/\s+/);
    assert.ok(!packages.includes('tools'),'The removed legacy tools package must never be requested');
    for(const required of ['platform-tools','platforms;android-'+compileSdk,'build-tools;36.0.0']) {
      assert.ok(packages.includes(required),'Missing explicit SDK package: '+required);
    }
  });
}
