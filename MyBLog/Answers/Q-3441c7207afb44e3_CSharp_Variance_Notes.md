<!-- bank-question-id: Q-b8893a07ccd955d4 -->
# Question ID: Q-3441c7207afb44e3

# C# Covariance, Contravariance, and Invariance

## Question
**Is the type parameter of `List<T>` declared as `in T`?**

**Answer:** No. `List<T>` is **invariant**. Its generic parameter is written as `T`, without `in` or `out`.

## 1. Why is `List<T>` invariant?

A list allows you to **add** items and **read** items:

```csharp
public class Animal { }
public class Dog : Animal { }
public class Cat : Animal { }

List<Dog> dogs = new List<Dog>();
dogs.Add(new Dog());       // Input
Dog firstDog = dogs[0];  // Output
```

Imagine this conversion were allowed:

```csharp
List<Dog> dogs = new List<Dog>();
List<Animal> animals = dogs; // Does NOT compile
animals.Add(new Cat());     // Would put a Cat into a List<Dog>!
```

C# prevents this to keep the list type-safe. Generic classes such as `List<T>` cannot declare their type parameters as variant (`in` or `out`). Generic **interfaces** and **delegates** can.

## 2. Why does `IEnumerable<Animal>` work with a list of dogs?

```csharp
List<Dog> dogs = new List<Dog> { new Dog() };
IEnumerable<Animal> animals = dogs; // Valid
```

`List<Dog>` implements `IEnumerable<Dog>`. `IEnumerable<out T>` is **covariant**, so a sequence producing dogs can be used where a sequence producing animals is expected. `IEnumerable<T>` does not expose an `Add` method.

```csharp
public interface IProducer<out T>
{
    T Get();
}
```

Think: **covariance (`out`) = producing a more specific type is safe when a more general type is expected.**

## 3. What is contravariance?

```csharp
public interface IHandler<in T>
{
    void Handle(T item);
}

public class AnimalHandler : IHandler<Animal>
{
    public void Handle(Animal item) => Console.WriteLine("Handled an animal");
}

IHandler<Animal> generalHandler = new AnimalHandler();
IHandler<Dog> dogHandler = generalHandler; // Valid
dogHandler.Handle(new Dog());
```

A handler that accepts **any animal** can safely handle a dog. This is **contravariance (`in`)**.

## 4. Quick comparison

| Generic type | Variance | Why? |
|---|---|---|
| `List<T>` | Invariant | Reads and adds items |
| `ICollection<T>` | Invariant | Reads and adds items |
| `IEnumerable<out T>` | Covariant | Produces items |
| `IComparer<in T>` | Contravariant | Consumes items to compare |
| `Action<in T>` | Contravariant | Accepts an argument |
| `Func<in T, out TResult>` | Both | Accepts input and returns output |

> Note: Variance conversions for constructed generic interfaces and delegates apply to reference types. For example, `IEnumerable<int>` does not implicitly convert to `IEnumerable<object>`.

## 5. Interview-ready explanation

`List<T>` is invariant because it lets us both read and add values. If `List<Dog>` could be treated as `List<Animal>`, someone could add a `Cat` to a list of dogs. However, `List<Dog>` can be used as `IEnumerable<Animal>` because `IEnumerable<out T>` supports covariance and only exposes values for reading.

## 6. Practice question

**What kind of variance does `ICollection<T>` support?**

A. Contravariance (`in T`)

B. Covariance (`out T`)

C. Neither — it is invariant (`T`)

**Answer:** C. `ICollection<T>` supports both reading and adding items, so its type parameter is invariant.
