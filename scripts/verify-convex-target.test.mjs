import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyConvexTarget} from './convex-release-target.mjs'
const valid={VITE_CONVEX_URL:'https://example-123.convex.cloud',VITE_CONVEX_SITE_URL:'https://example-123.convex.site',ADC_RESOLVED_CONVEX_URL:'https://example-123.convex.cloud'}
test('production target must match both existing public endpoints',()=>assert.doesNotThrow(()=>verifyConvexTarget(valid)))
test('different target fails closed',()=>assert.throws(()=>verifyConvexTarget({...valid,ADC_RESOLVED_CONVEX_URL:'https://other-456.convex.cloud'}),/target mismatch/))
test('wrong site fails closed',()=>assert.throws(()=>verifyConvexTarget({...valid,VITE_CONVEX_SITE_URL:'https://other-456.convex.site'}),/HTTP site/))
test('missing endpoint fails closed',()=>assert.throws(()=>verifyConvexTarget({...valid,VITE_CONVEX_URL:undefined})))
test('custom or non-HTTPS target is not silently accepted',()=>{assert.throws(()=>verifyConvexTarget({...valid,VITE_CONVEX_URL:'http://example-123.convex.cloud'}));assert.throws(()=>verifyConvexTarget({...valid,VITE_CONVEX_URL:'https://example.com',ADC_RESOLVED_CONVEX_URL:'https://example.com'}))})
