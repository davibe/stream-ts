
export interface Disposable {
  dispose(): void
}
export const disposableFunc = (fn: () => any): Disposable => {
  return new class implements Disposable {
    dispose = () => { fn() }
  }
}


export class VStream<T> implements Disposable {
  private subscriptions: Array<Subscription<T>> = []
  public disposables: Array<Disposable> = []

  constructor(public value: T) {
    this.value = value
  }

  subscribe = (replay: Boolean = false, handler: (value: T) => void): Subscription<T> => {
    const sub = new Subscription<T>(this, handler)
    this.subscriptions.push(sub)
    if (replay) {
      handler(this.value)
    }
    return sub
  }

  unsubscribe = (sub: Subscription<T>) => {
    this.subscriptions = this.subscriptions.filter(s => s != sub)
  }

  update = (value: T): VStream<T> => {
    this.value = value
    this.subscriptions.forEach(sub => sub.handler(value))
    return this
  }

  map = <U>(transform: (value: T) => U): VStream<U> => {
    const stream = new VStream(transform(this.value))
    stream.disposables.push(
      this.subscribe(true, v => stream.update(transform(v)))
    )
    return stream
  }

  distinctSimple = (): VStream<T> => {
    return this.distinct(v => v)
  }

  distinct = <U>(f: (value: T) => U): VStream<T> => {
    const stream = new VStream(this.value)
    stream.disposables.push(
      this.subscribe(true, v => {
        if (f(stream.value) != f(v)) {
          stream.update(v)
        }
      })
    )
    return stream
  }

  fold = <U>(initialValue: U, accumulator: (a: U, b: T) => U): VStream<U> => {
    // TODO: would it make sense to use the current value as initial (this.value)
    // instead of receiving it as a parameter ?
    var prev = initialValue
    return this.map(v => {
      const newValue = accumulator(prev, v)
      prev = newValue
      return newValue
    })
  }

  // TODO: what is the true meaning of filtef for value stream ?
  // currently we only filter NEXT values, and we trigger current
  filter = (f: (value: T) => Boolean): VStream<T> => {
    const stream = new VStream(this.value)
    stream.disposables.push(
      this.subscribe(true, v => { if (f(v)) { stream.update(v) } })
    )
    return stream
  }

  // TODO: true meaning of take in this case ?
  take = (amount: number): VStream<T> => {
    const stream = new VStream(this.value)
    var count = 0
    stream.disposables.push(
      this.subscribe(true, v => {
        if (count <= amount) {
          stream.update(v)
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
  }

}


class Subscription<T> implements Disposable {
  constructor(
    private stream: VStream<T> | undefined,
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

export function combine<A, B>(args: [VStream<A>, VStream<B>]): VStream<[A, B]>
export function combine<A, B, C>(args: [VStream<A>, VStream<B>, VStream<C>]): VStream<[A, B, C]>
export function combine<A, B, C, D>(args: [VStream<A>, VStream<B>, VStream<C>, VStream<D>]): VStream<[A, B, C, D]>
export function combine<A, B, C, D, E>(args: [VStream<A>, VStream<B>, VStream<C>, VStream<D>, VStream<E>]): VStream<[A, B, C, D, E]>
export function combine<A, B, C, D, E, F>(args: [VStream<A>, VStream<B>, VStream<C>, VStream<D>, VStream<E>, VStream<F>]): VStream<[A, B, C, D, E, F]>

// this is type-unsafe but typesafety is ensured above :)
export function combine(streams: any[]): VStream<any[]> {
  const stream = new VStream(streams.map(v => v.value))
  const update = (): void => {
    stream.update(streams.map(v => v.value))
  }
  const combinedStreams = streams
  // destroying when all parents die
  var count = streams.length
  const dispose = () => --count === 0 && stream.dispose();
  combinedStreams.map(s => {
    stream.disposables.push(s.subscribe(false, update))
    s.disposables.push(disposableFunc(dispose))
  })
  return stream
}