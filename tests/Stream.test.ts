import { Stream, combine2 }  from '../src/Stream'
import { assert } from 'chai'

describe('stream', () => {
  it('subscribe simple', () => {
    const stream = new Stream<String|undefined>()
    let result: String | undefined = undefined
    let sub = stream.subscribe(false, v => { result = v })
    stream.trigger("ciao")
    stream.trigger("mondo")
    assert.deepEqual(result, "mondo")
    sub.dispose()
  })

  it('unsubscribe simple', () => {
    const stream = new Stream<String | undefined>()
    let result: String | undefined = undefined
    let sub = stream.subscribe(false, v => { result = v })
    stream.trigger("ciao")
    stream.unsubscribe(sub)
    stream.trigger("mondo")
    assert.deepEqual(result, "ciao")
    sub.dispose()
  })

  it('test no value', () => {
    const stream = new Stream<undefined>()
    let called = false
    let sub = stream.subscribe(false, v => { called = true })
    stream.trigger(undefined)
    assert(called)
    sub.dispose()
  })

  it('test last', () => {
    const stream = new Stream<String>()
    stream.last(v => { assert.equal(v, undefined)} )
    stream.trigger("1")
    assert(stream.valuePresent)
    stream.last(v => { assert.equal(v, "1") })
  })

  it('test map', () => {
    const stream = new Stream<number|undefined>()
    stream.trigger(undefined)
    let result: Array<String|undefined> = []
    const sub = stream
      .map(v => (v || "undefined") + "")
      .map(v => (v || "undefined") + "")
      .map(v => (v || "undefined") + "")
      .map(v => (v || "undefined") + "")
      .map(v => (v || "undefined") + "")
      .subscribe(true, v => result.push(v))
    stream.trigger(1).trigger(2)
    assert.deepEqual(["undefined", "1", "2"], result)
    sub.dispose()
  })

  it('test distinct', () => {
    const stream = new Stream<String>()
    let result: Array<String> = []
    const sub = stream.distinctSimple().subscribe(true, v => result.push(v))
    stream
      .trigger("1")
      .trigger("2").trigger("2")
      .trigger("3").trigger("3").trigger("3")
    assert.deepEqual(["1", "2", "3"], result)
    sub.dispose()
  })

  it('test fold', () => {
    const stream = new Stream<String | undefined>()
    let result: { first: String | undefined, second: String | undefined } = { first: undefined, second: undefined }
    const sub = stream.trigger(undefined)
      .fold(result, (a, b) => { return { first: a.second, second: b } })
      .subscribe(true, pair => result = pair)
    assert.deepEqual({first: undefined, second: undefined}, result)
    stream.trigger("1")
    assert.deepEqual({ first: undefined, second: "1" }, result)
    stream.trigger("2")
    assert.deepEqual({ first: "1", second: "2" }, result)
    stream.trigger("3")
    assert.deepEqual({ first: "2", second: "3" }, result)
    stream.trigger(undefined)
    assert.deepEqual({ first: "3", second: undefined }, result)
    sub.dispose()
  })

  it('test filter', () => {
    const stream = new Stream<String>()
    let result: Array<String> = []
    stream.trigger("2").trigger("2")
    const sub = stream.filter( v => v == "2" ).subscribe(false, v => result.push(v))
    stream
      .trigger("1")
      .trigger("2").trigger("2")
      .trigger("3").trigger("3").trigger("3")
    assert.deepEqual(["2", "2"], result)
    sub.dispose()
  })

  it('test take', () => {
    const stream = new Stream<String>()
    let result: Array<String> = []
    stream.trigger("2").trigger("2")
    const sub = stream.take(3).subscribe(false, v => result.push(v))
    stream
      .trigger("1")
      .trigger("2").trigger("2")
      .trigger("3").trigger("3").trigger("3")
    assert.deepEqual(["1", "2", "2"], result)
    sub.dispose()
  })

  it('test take 2', () => {
    const stream = new Stream<String>()
    let result: Array<String> = []
    stream.trigger("2").trigger("2")
    const sub = stream.take(3).subscribe(true, v => result.push(v))
    stream
      .trigger("1")
      .trigger("2").trigger("2")
      .trigger("3").trigger("3").trigger("3")
    assert.deepEqual(["2", "1", "2", "2"], result)
    sub.dispose()
  })

  it('test take many', () => {
    const stream = new Stream<String>()
    let result: Array<String> = []
    stream.trigger("2").trigger("2")
    const sub = stream.take(300).subscribe(true, v => result.push(v))
    stream
      .trigger("1")
      .trigger("2").trigger("2")
      .trigger("3").trigger("3").trigger("3")
    assert.deepEqual(["2", "1", "2", "2", "3", "3", "3"], result)
    sub.dispose()
  })

  it('combine2', () => {
    const a = new Stream<String>()
    const b = new Stream<String | undefined>()
    let result: Array <[String, String | undefined]> = []
    const sub = combine2(a, b)
      .distinct(v => v.join(","))
      .subscribe(false, v => result.push(v))
    a.trigger("1")
    b.trigger(undefined)
    b.trigger("2")
    a.trigger("2")
    a.trigger("2")
    a.dispose()
    b.trigger("3")
    assert.deepEqual([
      ["1", undefined],
      ["1", "2"],
      ["2", "2"]
    ], result)
    sub.dispose()
  })

})

describe('stream', () => {

  it('subscription', () => {
    const stream = new Stream<number>()
    let results: Array<number> = []
    let sub = stream.subscribe(false, v => { results.push(v) })
    stream.trigger(1) 
    stream.trigger(2)
    assert.deepEqual(results, [1, 2])
    sub.dispose()
  })

  it('subscription replay', () => {
    const stream = new Stream<number>()
    stream.trigger(0)
    let results: Array<number> = []
    const sub = stream.subscribe(true, v => { results.push(v) })
    stream.trigger(1)
    stream.trigger(2)
    assert.deepEqual(results, [0, 1, 2])
    sub.dispose()
  })

  it('subscription dispose', () => {
    const stream = new Stream<number>()
    stream.trigger(0)
    let results: Array<number> = []
    const sub = stream.subscribe(true, v => { results.push(v) })
    stream.trigger(1)
    sub.dispose()
    stream.trigger(2)
    assert.deepEqual(results, [0, 1])
  })

  it('wait for a value', async () => {
    const stream = new Stream<number>()
    setTimeout(() => {
      stream.trigger(10)
      stream.dispose()
    }, 10)
    await stream.wait(false, v => v == 10)
  })

  it('wait for current value', async () => {
    const stream = new Stream<number>().trigger(0)
    await stream.wait(true, v => v == 0)
  })

})