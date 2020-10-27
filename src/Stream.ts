
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

// let it be dragons

export function combine<A, B>(streams: [Stream<A>, Stream<B>]): Stream<[A, B]>
export function combine<A, B, C>(streams: [Stream<A>, Stream<B>, Stream<C>]): Stream<[A, B, C]>
export function combine<A, B, C, D>(streams: [Stream<A>, Stream<B>, Stream<C>, Stream<D>]): Stream<[A, B, C, D]>
export function combine<A, B, C, D, E>(streams: [Stream<A>, Stream<B>, Stream<C>, Stream<D>, Stream<E>]): Stream<[A, B, C, D, E]>
export function combine<A, B, C, D, E, F>(streams: [Stream<A>, Stream<B>, Stream<C>, Stream<D>, Stream<E>, Stream<F>]): Stream<[A, B, C, D, E, F]>

// this is type-unsafe but typesafety is ensured above :)
export function combine(streams: any[]): Stream<any[]> {
  const stream = new Stream<any[]>()
  const trigger = (): void => {
    const values: any[] = []
    streams.forEach(s => s.last(v => values.push(v)))
    if (values.length == streams.length) {
      stream.trigger(values)
    }
  }
  const combinedStreams = streams
  // destroying when all parents die
  var count = streams.length
  const dispose = () => --count === 0 && stream.dispose();
  combinedStreams.map(s => {
    stream.disposables.push(s.subscribe(true, trigger))
    s.disposables.push(disposableFunc(dispose))
  })
  return stream
}