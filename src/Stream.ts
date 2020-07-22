
interface Disposable {
  dispose(): void
}
const disposableFunc = (fn: () => void): Disposable => {
  return new class implements Disposable {
    dispose = () => { fn() }
  }
}


export class Stream<T> implements Disposable {
  private subscriptions: Array<Subscription<T>> = []
  public disposables: Array<Disposable> = []
  private value: T
  valuePresent: Boolean = false

  constructor() { }

  subscribe = (replay: Boolean = false, handler: (value: T) => void): Subscription<T> => {
    const sub = new Subscription<T>(this, handler)
    this.subscriptions.push(sub)
    if (replay && this.valuePresent) {
      handler(this.value)
    }
    return sub
  }

  unsubscribe = (sub: Subscription<T>) => {
    this.subscriptions = this.subscriptions.filter(s => s != sub)
  }

  trigger = (value: T): Stream<T> => {
    this.value = value
    this.valuePresent = true
    this.subscriptions.forEach(sub => sub.handler(value))
    return this
  }

  last = (fn: (value: T) => void) => {
    if (this.valuePresent) { fn(this.value) }
  }

  map = <U>(transform: (value: T) => U): Stream<U> => {
    const stream = new Stream<U>()
    stream.disposables.push(
      this.subscribe(true, v => stream.trigger(transform(v)))
    )
    return stream
  }

  distinctSimple = (): Stream<T> => {
    return this.distinct(v => v)
  }

  distinct = <U>(f: (value: T) => U): Stream<T> => {
    const stream = new Stream<T>()
    var waitingFirstValue = !this.valuePresent
    stream.disposables.push(
      this.subscribe(true, v => {
        if (waitingFirstValue || f(stream.value) != f(v)) {
          stream.trigger(v)
          waitingFirstValue = false
        }
      })
    )
    return stream
  }

  fold = <U>(initialValue: U, accumulator: (a: U, b: T) => U): Stream<U> => {
    var current = initialValue
    return this.map(v => {
      const newValue = accumulator(current, v)
      current = newValue
      return newValue
    })
  }

  filter = (f: (value: T) => Boolean): Stream<T> => {
    const stream = new Stream<T>()
    stream.disposables.push(
      this.subscribe(true, v => { if (f(v)) { stream.trigger(v) } })
    )
    return stream
  }

  take = (amount: number): Stream<T> => {
    const stream = new Stream<T>()
    var count = 0
    stream.disposables.push(
      this.subscribe(true, v => {
        if (count <= amount) {
          stream.trigger(v)
          count += 1
        } else {
          stream.dispose()
        }
      })
    )
    return stream
  }

  wait = (replay: Boolean = true, handler: (value: T) => Boolean): Promise<T> => {
    return new Promise((resolve, reject) => {
      this.subscribe(replay, v => {
        if (handler(v)) { resolve(v) }
      })
      this.disposables.push(disposableFunc(() => {
        reject()
      }))
    })
  }

  dispose = () => {
    this.subscriptions.forEach(s => s.dispose())
    this.subscriptions = []
    this.disposables.forEach(d => d.dispose())
    this.disposables = []
    this.valuePresent = false
  }

}


class Subscription<T> implements Disposable {
  constructor(
    private stream: Stream<T> | undefined,
    public handler: (value: T) => void
  ) {
    this.stream = stream
    this.handler = handler
  }
  dispose = () => {
    if (this.stream == undefined) { return }
    this.stream.unsubscribe(this)
    this.stream = undefined
    this.handler = () => { }
  }
}

export const combine2 = <A, B>(a: Stream <A>, b: Stream<B>): Stream<[A, B]> => {
  const stream = new Stream<[A, B]>()
  const trigger = (): void => {
    a.last(va => {
      b.last(vb => {
        stream.trigger([va, vb])
      })
    })
  }
  stream.disposables.push(a.subscribe(true, v => trigger()))
  stream.disposables.push(b.subscribe(true, v => trigger()))
  // destroying when all parents die
  var count = 2
  const dispose = (): void => {
    count -= 1
    if (count == 0) { stream.dispose() }
  }
  a.disposables.push(disposableFunc(dispose))
  b.disposables.push(disposableFunc(dispose))
  return stream
}