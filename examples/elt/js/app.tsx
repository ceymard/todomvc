/**
 * A TodoMVC implementation using elt.
 *
 * Note that the implementation is "Naïve", as it could have used an "App.Service"
 * for code encapsulation, but I felt it was artificial in regard to the actual
 * quantity of code needed.
 */

// Some type definitions
type TodoItem = {
  text: string
  completed: boolean
}

// We'll be using the umd version of elt, because there's no need to bother with
// webpack for this very simple app.
const { setup_mutation_observer, Fragment: $, $bind, $on, $observe, $click, o, tf, If, Repeat } = elt

// Start by registering the MutationObserver on the document.
// This mutation observer is responsible for calling `inserted` and `removed` callbacks
//  on the nodes that enter / leave the document, which automatically start/stop observing
// of observables without manual intervention from the programmer.
// This helps *a lot* in not having memory leaking.
setup_mutation_observer(document)

// We're going to store our data in local storage. The API is very simple, no need for any kind of
// wrappers for that.
const STORE_KEY = '__elt__todomvc'
const prev_items_storage = localStorage.getItem(STORE_KEY)

// This is the main observable variable that holds our list.
// No matter what manipulation is done by the code below, all the modifications end up here.
const o_todo_items = o(JSON.parse(prev_items_storage || '[]') as TodoItem[])

// Callback functions for list filtering.
const filter_all = (it: TodoItem) => true
const filter_completed = (it: TodoItem) => it.completed
const filter_active = (it: TodoItem) => !it.completed

// This observable holds the current filter that will be applied to the list.
const o_filter = o(filter_all)

// o_filtered_items is a "transformed" observable that provides bidirection transformations,
// thanks to tf.array_filter. In essence, this means that this observable is writable and
// knows how to forward changes made to it to the observable it comes from.
// The other interesting part in here is that a transform can be done *using another observable*.
// The array filtering method is indeed observable itself. Whenever it changes, the contents
// of o_filtered_items change as well !
const o_filtered_items = o_todo_items.tf(tf.array_filter(o_filter))

// The variable that will hold the text entered in the top input box.
const o_new_todo = o('')

// Add a new todo item to the list.
function new_todo() {
  const new_todo = o_new_todo.get()
  if (new_todo) {
    o_todo_items.mutate(items => {
      // clone the array since we need to keep stuff immutable for change detection
      // to happen.
      var res = items.slice()
      res.push({text: new_todo, completed: false})
      return res
    })
    o_new_todo.set('')
  }
}

// This is not "routing". Elt does not at this time offer routing facilities.
// The hash API is fairly straightforward though.
function eval_hash() {
  if (location.hash === '#/all')
    o_filter.set(filter_all)
  else if (location.hash === '#/active')
    o_filter.set(filter_active)
  else if (location.hash === '#/completed')
    o_filter.set(filter_completed)
}

window.addEventListener('hashchange', eval_hash)
eval_hash()

const ENTER = 13
const ESCAPE = 27


function TodoItemEntry(a: elt.Attrs<HTMLLIElement> & { item: elt.o.Observable<TodoItem> }) {
  const o_item = a.item
  const o_editing = o(false)
  const o_completed = o_item.p('completed')
  const o_text = o_item.p('text')

  // We take the input out to easily be able to focus it when double clicking
  // on the label.
  const __input = <input class='edit' type='text'>
    {$bind.string(o_text)}
    {$on('keydown', ev => {
      if (ev.keyCode === ENTER || ev.keyCode === ESCAPE) {
        o_editing.set(false)
      }
    })}
    {$on('focusout', _ => {
      o_editing.set(false)
    })}
  </input> as HTMLInputElement

  return <li class={['todo', {completed: o_completed, editing: o_editing}]}>
    <div class='view'>
      <input type='checkbox' class='toggle'>
        {$bind.boolean(o_completed)}
      </input>
      <label>
        {o_text}
        {$on('dblclick', _ => {
          o_editing.set(true)
          __input.focus()
        })}
      </label>
      <button class='destroy'>
        {$click(_ => {
          const current = o_item.get()
          o_todo_items.mutate(items => items.filter(i => i !== current))
        })}
      </button>
    </div>
    {__input}
  </li>
}


document.body.appendChild(<$>
  <section class="todoapp">
    {$observe(o_todo_items, items => {
      localStorage.setItem(STORE_KEY, JSON.stringify(items))
    })}
    <header class="header">
      <h1>todos</h1>
      <input class="new-todo" placeholder="What needs to be done?" autofocus>
        {$bind.string(o_new_todo)}
        {$on('keydown', ev => {
          if (ev.code === 'Enter') new_todo()
        })}
      </input>
    </header>
    {If(o_todo_items.p('length'), o_length => <$>
      <ul class='todo-list'>
        {Repeat(o_filtered_items, (o_item) => <TodoItemEntry item={o_item}/>)}
      </ul>
      <footer class="footer">
        <span class='todo-count'>{o_todo_items.tf(i => i.filter(t => !t.completed).length)} items left</span>
        <ul class='filters'>
          <li><a class={{selected: o_filter.tf(tf.equals(filter_all))}} href='#/all'>All</a></li>
          <li><a class={{selected: o_filter.tf(tf.equals(filter_active))}} href='#/active'>Active</a></li>
          <li><a class={{selected: o_filter.tf(tf.equals(filter_completed))}} href='#/completed'>Completed</a></li>
        </ul>
        {If(o_todo_items.tf(i => i.filter(it => it.completed).length), () =>
          <button class='clear-completed'>
            Clear completed
            {$click(_ => {
              // set the todo items to the list of non completed items.
              // this is all there is to do to clear the list.
              o_todo_items.mutate(it => it.filter(i => !i.completed))
            })}
          </button>
        )}
      </footer>
    </$>)}
  </section>
  <footer class="info">
    <p>Double-click to edit a todo</p>
    <p>Written by <a href="https://github.com/ceymard">Christophe Eymard</a></p>
    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>
  </footer>
</$>)