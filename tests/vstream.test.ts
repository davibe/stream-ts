import { VStream }  from './../src/VStream'
import { assert } from 'chai'

describe('vstream', () => {

  it('subscription', () => {
    const s = new VStream(0)
    let results: Array<number> = []
    s.subscribe(false, v => { results.push(v) })
    s.trigger(1) 
    s.trigger(2)
    assert.deepEqual(results, [1, 2])
    s.dispose()
  })

  it('subscription replay ', () => {
    const s = new VStream(0)
    let results: Array<number> = []
    s.subscribe(true, v => { results.push(v) })
    s.trigger(1)
    s.trigger(2)
    assert.deepEqual(results, [0, 1, 2])
    s.dispose()
  })

  it('subscription dispose', () => {
    const s = new VStream(0)
    let results: Array<number> = []
    s.subscribe(true, v => { results.push(v) })
    s.trigger(1)
    s.dispose()
    s.trigger(2)
    assert.deepEqual(results, [0, 1])
  })

})