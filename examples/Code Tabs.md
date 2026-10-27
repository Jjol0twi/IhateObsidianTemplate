## Filter Active Users

> The same operation in three languages, displayed in one code area.

````ihate-template-code
```kotlin Kotlin
data class User(val name: String, val active: Boolean)

val users = listOf(User("Alex", true), User("Sam", false))
val names = users.filter { it.active }.map { it.name }

println(names)
```
```python Python
users = [
    {"name": "Alex", "active": True},
    {"name": "Sam", "active": False},
]
names = [user["name"] for user in users if user["active"]]

print(names)
```
```typescript TypeScript
const users = [
  { name: "Alex", active: true },
  { name: "Sam", active: false },
];
const names = users.filter(user => user.active).map(user => user.name);

console.log(names);
```
````

## Result

Only Alex remains in the list. The next section stays below one code block regardless of the number of languages.
