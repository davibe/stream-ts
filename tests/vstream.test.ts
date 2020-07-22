import { VStream } from '../src/VStream'
import { assert } from 'chai'

describe('vstream', () => {
  it('subscribe simple', () => {
    const stream = new VStream<String | undefined>("")
    let result: String | undefined = undefined
    let sub = stream.subscribe(false, v => { result = v })
    stream.update("ciao")
    stream.update("mondo")
    assert.deepEqual(result, "mondo")
    sub.dispose()
  })

  it('unsubscribe simple', () => {
    const stream = new VStream<String | undefined>(undefined)
    let result: String | undefined = undefined
    let sub = stream.subscribe(false, v => { result = v })
    stream.update("ciao")
    stream.unsubscribe(sub)
    stream.update("mondo")
    assert.deepEqual(result, "ciao")
    sub.dispose()
  })


  it('test last', () => {
    const stream = new VStream<String>("")
    assert.equal(stream.value, "")
    stream.update("1")
    assert(stream.value)
    assert.equal(stream.value, "1")
  })

  it('test map', () => {
    const stream = new VStream<number | undefined>(undefined)
    stream.update(undefined)
    let result: Array<String | undefined> = []
    const sub = stream
      .map(v => (v || "undefined") + "")
      .map(v => (v || "undefined") + "")
      .map(v => (v || "undefined") + "")
      .map(v => (v || "undefined") + "")
      .map(v => (v || "undefined") + "")
      .subscribe(true, v => result.push(v))
    stream.update(1).update(2)
    assert.deepEqual(["undefined", "1", "2"], result)
    sub.dispose()
  })

  it('test distinct', () => {
    const stream = new VStream<String>("")
    let result: Array<String> = []
    const sub = stream.distinctSimple().subscribe(false, v => result.push(v))
    stream
      .update("")
      .update("1")
      .update("2").update("2")
      .update("3").update("3").update("3")
    assert.deepEqual(["1", "2", "3"], result)
    sub.dispose()
  })

  it('test distinct with replay', () => {
    const stream = new VStream<String>("")
    let result: Array<String> = []
    const sub = stream.distinctSimple().subscribe(true, v => result.push(v))
    stream
      .update("")
      .update("1")
      .update("2").update("2")
      .update("3").update("3").update("3")
    assert.deepEqual(["", "1", "2", "3"], result)
    sub.dispose()
  })

  it('test fold', () => {
    const stream = new VStream<String | undefined>(undefined)
    let result: { first: String | undefined, second: String | undefined } = { first: undefined, second: undefined }
    const sub = stream.update(undefined)
      .fold(result, (a, b) => { return { first: a.second, second: b } })
      .subscribe(true, pair => result = pair)
    assert.deepEqual({ first: undefined, second: undefined }, result)
    stream.update("1")
    assert.deepEqual({ first: undefined, second: "1" }, result)
    stream.update("2")
    assert.deepEqual({ first: "1", second: "2" }, result)
    stream.update("3")
    assert.deepEqual({ first: "2", second: "3" }, result)
    stream.update(undefined)
    assert.deepEqual({ first: "3", second: undefined }, result)
    sub.dispose()
  })

  it('test filter', () => {
    const stream = new VStream<String>("")
    let result: Array<String> = []
    stream.update("2").update("2")
    const sub = stream.filter(v => v == "2").subscribe(false, v => result.push(v))
    stream
      .update("1")
      .update("2").update("2")
      .update("3").update("3").update("3")
    assert.deepEqual(["2", "2"], result)
    sub.dispose()
  })

  it('test filter with replay', () => {
    const stream = new VStream<String>("")
    let result: Array<String> = []
    stream.update("2").update("-1")
    const sub = stream.filter(v => v == "2").subscribe(true, v => result.push(v))
    stream
      .update("1")
      .update("2").update("2")
      .update("3").update("3").update("3")
    // filter cannot filter the "current" value
    // therefore it will be replayed if requested ("-1" in this case)
    assert.deepEqual(["-1", "2", "2"], result)
    sub.dispose()
  })

  it('test take', () => {
    const stream = new VStream("2")
    let result: Array<String> = []
    stream.update("2")
    const sub = stream.take(3).subscribe(false, v => result.push(v))
    stream
      .update("1")
      .update("2").update("2")
      .update("3").update("3").update("3")
    assert.deepEqual(["1", "2", "2"], result)
    sub.dispose()
  })

  it('test take 2', () => {
    const stream = new VStream("2")
    let result: Array<String> = []
    stream.update("2")
    const sub = stream.take(3).subscribe(true, v => result.push(v))
    stream
      .update("1")
      .update("2").update("2")
      .update("3").update("3").update("3")
    assert.deepEqual(["2", "1", "2", "2"], result)
    sub.dispose()
  })

})

describe('vstream', () => {

  it('subscription', () => {
    const stream = new VStream(0)
    let results: Array<number> = []
    let sub = stream.subscribe(false, v => { results.push(v) })
    stream.update(1)
    stream.update(2)
    assert.deepEqual(results, [1, 2])
    sub.dispose()
  })

  it('subscription replay', () => {
    const stream = new VStream(0)
    let results: Array<number> = []
    const sub = stream.subscribe(true, v => { results.push(v) })
    stream.update(1)
    stream.update(2)
    assert.deepEqual(results, [0, 1, 2])
    sub.dispose()
  })

  it('subscription dispose', () => {
    const stream = new VStream(0)
    let results: Array<number> = []
    const sub = stream.subscribe(true, v => { results.push(v) })
    stream.update(1)
    sub.dispose()
    stream.update(2)
    assert.deepEqual(results, [0, 1])
  })

  it('wait for a value', async () => {
    const stream = new VStream(0)
    setTimeout(() => {
      stream.update(10)
      stream.dispose()
    }, 10)
    await stream.wait(false, v => v == 10)
  })

  it('wait for current value', async () => {
    const stream = new VStream(0)
    await stream.wait(true, v => v == 0)
  })

})