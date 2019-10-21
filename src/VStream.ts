
interface Disposable {
  dispose() : void
}
const disposableFunc = (fn: () => void) : Disposable => {
  return new class implements Disposable {
    dispose = () => { fn() }
  }
}


export class VStream<T> implements Disposable {
  private subscriptions: Array<Subscription<T>> = []
  private disposables: Array<Disposable> = []

  constructor(public value: T) {
    this.value = value
  }

  subscribe = (replay: Boolean = false, handler: (value: T) => void) : Subscription<T> => {
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

  trigger = (value: T) : VStream<T> => {
    this.value = value
    this.subscriptions.forEach(sub => sub.handler(value))
    return this
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
    this.handler = () => {}
  }
}