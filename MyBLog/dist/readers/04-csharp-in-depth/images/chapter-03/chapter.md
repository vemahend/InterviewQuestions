# Chapter 3: Parameterized typing with generics

> Source: C# in Depth, Third Edition — Jon Skeet. Original PDF pages 90–135.

[← Table of contents](../README.md)


<!-- PDF page 90 -->

## Parameterized typing

## with generics

This chapter covers
Type inference for generic methods
Type constraints
Reflection and generics
CLR behavior
Limitations of generics
Comparisons with other languages
True story:1 The other day my wife and I went out to do our weekly grocery shop-
ping. Just before we left, she asked me if I had the list. I confirmed that I did have
the list, and off we went. It was only when we got to the grocery store that our mis-
take became obvious. My wife had been asking about the shopping list, whereas I’d
brought the list of neat features in C# 2. When we asked an assistant whether we
could buy any anonymous methods, we received a strange look.
1 By which I mean “convenient for the purposes of introducing the chapter”—not necessarily accurate.


<!-- PDF page 91 -->

Parameterized typing with generics
If only we could’ve expressed ourselves more clearly! If only she’d had some way of
saying that she wanted me to bring the list of items we wanted to buy! If only we’d had
generics…
For most developers, generics are the most important new feature of C# 2. They
enhance performance, make your code more expressive, and move a lot of safety
checks from execution time to compile time. Essentially, they allow you to parameterize
types and methods. Just as normal method calls often have parameters to tell them
what values to use, generic types and methods have type parameters to tell them what
types to use. It all sounds confusing to start with—and if you’re completely new to
generics, you can expect a certain amount of head scratching—but once you get the
basic idea, you’ll come to love them.
In this chapter, we’ll look at how to use generic types and methods that others have
provided (whether in the framework or as third-party libraries), and how to write your
own. Along the way, we’ll look at how generics work with the reflection calls in the API,
and at a bit of detail around how the CLR handles generics. To conclude the chapter,
I’ll present some of the most frequently encountered limitations of generics, along
with possible workarounds, and compare generics in C# with similar features in other
languages.
First, though, you need to understand the problems that led to generics being
devised in the first place.
3.1
Why generics are necessary
If you still have any C# 1 code available, look at it and count the casts—particularly in
code that uses collections extensively. Don’t forget that almost every use of foreach
contains an implicit cast. When you use types that are designed to work with many dif-
ferent types of data, that naturally leads to casting, quietly telling the compiler not to
worry, that everything’s fine; just treat the expression over there as if it had this partic-
ular type. Using almost any API that has object as either a parameter type or a return
type will probably involve casts at some point. Having a single-class hierarchy with
object as the root makes some things more straightforward, but the object type in
itself is extremely dull, and to do anything genuinely useful with an object you almost
always need to cast it.
Casts are bad, m’kay? Not bad in an almost never do this kind of way (like mutable
structs and nonprivate fields) but bad in a necessary evil kind of way. They’re an indica-
tion that you ought to give the compiler more information somehow, and that you’re
choosing to ask the compiler to trust you at compile time and to generate a check that
will run at execution time to keep you honest.
If you need to tell the compiler the information somehow, chances are that anyone
reading your code is also going to need the same information. They can see it where
you’re casting, of course, but that’s not terribly useful. The ideal place to keep such
information is usually at the point where you declare a variable or method. This is
even more important if you’re providing a type or method that other people will call


<!-- PDF page 92 -->

Why generics are necessary
without access to your code. Generics allow library providers to prevent their users from
compiling code that calls the library with bad arguments.
In C# 1, you had to rely on manually written documentation, which can easily
become incomplete or inaccurate, as duplicate information so often is. When the
extra information can be declared in code as part of a method or type declaration,
everyone can work more productively. The compiler can do more checking; the IDE
can present IntelliSense options based on the extra information (for instance, offer-
ing the members of string as the next step when you access an element within a list
of strings); callers of methods can be more confident that arguments passed in and
values returned are correct; and anyone maintaining your code can better understand
what was running through your head when you originally wrote it.
WILL GENERICS REDUCE YOUR BUG COUNT?
Every description of generics I’ve
read (including my own) emphasizes the importance of compile-time type
checking over execution-time type checking. I’ll let you in on a secret: I can’t
remember ever fixing a bug in released code that was directly due to the lack
of type checking. In other words, the casts we put in C# 1 code always worked,
in my experience. Those casts were like warning signs, forcing us to think
about the type safety explicitly rather than it flowing naturally in the code we
wrote. But although generics may not radically reduce the number of type
safety bugs you encounter, the greater readability they afford can reduce the
number of bugs across the board. Code that’s simple to understand is simple
to get right. Likewise, code that has to be robust in the face of malicious call-
ers is much simpler to write correctly when the type system can provide
appropriate guarantees.
All of this would be enough to make generics worthwhile, but there are performance
improvements, too. First, because the compiler can perform more enforcement, that
leaves less to be checked at execution time. Second, the JIT can treat value types in a
particularly clever way that manages to eliminate boxing and unboxing in many situa-
tions. In some cases, this can make a huge difference in performance in terms of both
speed and memory consumption.
Many of the benefits of generics may strike you as being similar to the benefits of
statically typed languages over dynamic ones: better compile-time checking, more
information expressed directly in the code, more IDE support, better performance.
The reason for this is fairly simple: when you’re using a general API (such as Array-
List) that can’t differentiate between the different types, you effectively are in a
dynamic situation in terms of access to that API. The reverse isn’t generally true, by the
way—the benefits that dynamic languages provide rarely apply to the choice between
generic and nongeneric APIs. When you can reasonably use generics, the decision to
do so is usually a no-brainer.
So, those are the goodies awaiting you in C# 2—now it’s time to start using generics.


<!-- PDF page 93 -->

Parameterized typing with generics
3.2
Simple generics for everyday use
The topic of generics has a lot of dark corners if you want to know everything about it.
The C# language specification goes into a great deal of detail in order to make sure
that the behavior is specified in pretty much every conceivable case. But you don’t
need to understand most of those corner cases in order to be productive. (The same is
true in other areas, in fact. For example, you don’t need to know all the exact rules
about definite assignment—you just fix the code appropriately when the compiler
complains.)
This section will cover most of what you’ll need in your day-to-day use of generics,
both for consuming generic APIs that other people have created and for creating your
own. If you get stuck while reading this chapter but want to keep making progress, I
suggest you concentrate on what you need to know in order to use generic types and
methods within the framework and other libraries; writing your own generic types and
methods crops up a lot less often than using the framework ones.
We’ll start by looking at one of the collection classes introduced in .NET 2.0—
Dictionary<TKey,TValue>.
3.2.1
Learning by example: a generic dictionary
Using generic types can be straightforward if you don’t happen to hit some of the lim-
itations and start wondering what’s wrong. You don’t even need to know any of the ter-
minology to make a pretty good guess as to what a piece of code will do, and with a bit
of trial and error you could experiment your way to writing your own working code.
(One of the benefits of generics is that more checking is done at compile time, so
you’re more likely to have working code when it all compiles—this makes the experi-
mentation simpler.) Of course, the aim of this chapter is to build your knowledge so
that you won’t be using guesswork—you’ll know what’s going on at every stage.
For now, let’s look at some code that’s straightforward, even if the syntax is unfa-
miliar. The following listing uses a Dictionary<TKey,TValue> (roughly the generic
equivalent of the nongeneric Hashtable class) to count the frequencies of words in a
given piece of text.
Listing 3.1
Using a Dictionary<TKey,TValue> to count words in text
static Dictionary<string,int> CountWords(string text)
{
Dictionary<string,int> frequencies;
frequencies = new Dictionary<string,int>();
Creates new map from
word to frequency
B
Splits text
into words
C
string[] words = Regex.Split(text, @"\W+");
foreach (string word in words)
{
if (frequencies.ContainsKey(word))
{
frequencies[word]++;
}
Adds to or
updates map
D


<!-- PDF page 94 -->

Simple generics for everyday use
else
{
frequencies[word] = 1;
}
}
return frequencies;
}
...
string text = @"Do you like green eggs and ham?
I do not like them, Sam-I-am.
I do not like green eggs and ham.";
Adds to or
updates map
D
Dictionary<string,int> frequencies = CountWords(text);
foreach (KeyValuePair<string,int> entry in frequencies)
{
string word = entry.Key;
int frequency = entry.Value;
Console.WriteLine ("{0}: {1}", word, frequency);
}
Prints each
key/value pair
from map
E
The CountWords method first creates an empty map from string to int B. This will
effectively count how often each word is used within the given text. You then use a reg-
ular expression C to split the text into words. It’s crude—you end up with an empty
string due to the period at the end of the text, and do and Do are counted separately.
These issues are easily fixable, but I wanted to keep the code as simple as possible for
this example.
For each word, you check whether it’s already in the map. If it is, you increment
the existing count; otherwise, you give the word an initial count of 1 D. Note how the
incrementing code doesn’t need to do a cast to int in order to perform the addition;
the value you retrieve is known to be an int at compile time. The step incrementing
the count is actually performing a get on the indexer for the map, then incrementing,
and then performing a set on the indexer. You may find it easier to keep this explicit,
using frequencies[word] = frequencies[word] + 1; instead.
The final part of the listing is familiar: enumerating through a Hashtable gives a
similar (nongeneric) DictionaryEntry with Key and Value properties for each
entry E. But in C# 1, you would’ve needed to cast both the word and the frequency,
because the key and value would’ve been returned as just object. That also means
that the frequency would’ve been boxed. Admittedly you don’t have to put the word
and the frequency into variables—you could’ve had a single call to Console.Write-
Line and passed entry.Key and entry.Value as arguments. I included the variables
here to ram home the point that no casting is necessary.
Now that you’ve seen an example, let’s look at what it means to talk about
Dictionary<TKey,TValue> in the first place. What are TKey and TValue, and why do
they have angle brackets around them?


<!-- PDF page 95 -->

Parameterized typing with generics
3.2.2
Generic types and type parameters
There are two forms of generics in C#: generic types (including classes, interfaces, dele-
gates, and structures—there are no generic enums) and generic methods. Both are
essentially ways of expressing an API (whether it’s for a single generic method or a
whole generic type) such that in some places where you’d expect to see a normal type,
you’ll see a type parameter instead.
A type parameter is a placeholder for a real type. Type parameters appear in angle
brackets within a generic declaration, using commas to separate them. So in
Dictionary<TKey,TValue>, the type parameters are TKey and TValue. When you use
a generic type or method, you specify the real types you want to use. These are called
the type arguments—for example, in listing 3.1 the type arguments were string (for
TKey) and int (for TValue).
JARGON ALERT!
A lot of detailed terminology is involved in generics. I’ve
included it for reference—and because occasionally it makes it easier to talk
about topics precisely. It could also be useful if you ever need to consult the
language specification, but you’re unlikely to need this terminology in day-to-
day life. Just grin and bear it for the moment. A lot of this terminology is
defined in section 4.4 of the C# 5 specification (“Constructed Types”)—look
there for further details.
The form of a generic type where none of the type parameters have been provided with
type arguments is called an unbound generic type. When type arguments are specified, the
type is said to be a constructed type. Unbound generic types are effectively blueprints for
constructed types, much like how types (generic or not) can be regarded as blueprints
for objects. It’s a sort of extra layer of abstraction. Figure 3.1 shows this graphically.
![Figure from PDF page 95](images/page-095-figure-0041.png)

Dictionary<TKey,TValue>
(unbound generic type)
![Figure from PDF page 95](images/page-095-figure-0042.png)

![Figure from PDF page 95](images/page-095-figure-0043.png)

![Figure from PDF page 95](images/page-095-figure-0044.png)

Specification of
type arguments
![Figure from PDF page 95](images/page-095-figure-0045.png)

![Figure from PDF page 95](images/page-095-figure-0046.png)

![Figure from PDF page 95](images/page-095-figure-0047.png)

![Figure from PDF page 95](images/page-095-figure-0048.png)

![Figure from PDF page 95](images/page-095-figure-0049.png)

![Figure from PDF page 95](images/page-095-figure-0050.png)

![Figure from PDF page 95](images/page-095-figure-0051.png)

![Figure from PDF page 95](images/page-095-figure-0052.png)

![Figure from PDF page 95](images/page-095-figure-0053.png)

(etc.)
Dictionary<string,int>
(constructed type)
Dictionary<byte,long>
(constructed type)
Hashtable
![Figure from PDF page 95](images/page-095-figure-0054.png)

![Figure from PDF page 95](images/page-095-figure-0055.png)

![Figure from PDF page 95](images/page-095-figure-0056.png)

Instantiation
Instantiation
Instantiation
![Figure from PDF page 95](images/page-095-figure-0057.png)

![Figure from PDF page 95](images/page-095-figure-0058.png)

![Figure from PDF page 95](images/page-095-figure-0059.png)

![Figure from PDF page 95](images/page-095-figure-0060.png)

![Figure from PDF page 95](images/page-095-figure-0061.png)

![Figure from PDF page 95](images/page-095-figure-0062.png)

![Figure from PDF page 95](images/page-095-figure-0063.png)

Instance of
Hashtable
Instance of
Dictionary<string,int>
Instance of
Dictionary<byte,long>
Nongeneric
blueprints
Generic
blueprints
Figure 3.1
Unbound generic types act as blueprints for constructed types, which then act as
blueprints for actual objects, just as nongeneric types do.


<!-- PDF page 96 -->

Simple generics for everyday use
As a further complication, types can be open or closed. An open type is one that still
involves a type parameter (as one of the type arguments, or as the array element type,
for example), whereas a closed type is one that isn’t open; every aspect of the type is
known precisely. All code actually executes in the context of a closed constructed type.
The only time you’ll see an unbound generic type within C# code (other than as a
declaration) is within the typeof operator, which you’ll meet in section 3.4.4.
The idea of a type parameter “receiving” information and a type argument “pro-
viding” the information—the dashed lines in figure 3.1—is exactly the same as with
method parameters and arguments, although type arguments have to be types rather
than just arbitrary values. The type argument has to be known at compile time, but it
can be (or can involve) a type parameter from the relevant context.
You can think of a closed type as having the API of the open type but with the type
parameters being replaced with their corresponding type arguments.2 Table 3.1 shows
some public method and property declarations from the open type Dictionary
<TKey,TValue> and the equivalent member in the closed type you built from it—
Dictionary<string,int>.
Table 3.1
Examples of how method signatures in generic types contain placeholders, which are
replaced when the type arguments are specified
Method signature in generic type
Method signature after type parameter
substitution
void Add(TKey key, TValue value)
void Add(string key, int value)
TValue this[TKey key] { get; set; }
int this[string key] { get; set; }
bool ContainsValue(TValue value)
bool ContainsValue(int value)
bool ContainsKey(TKey key)
bool ContainsKey(string key)
One important thing to note is that none of the methods in table 3.1 are actually
generic methods. They’re normal methods within a generic type, and they happen to
use the type parameters declared as part of the type. We’ll look at generic methods in
the next section.
Now that you know what TKey and TValue mean, and what the angle brackets are
for, you can see what the declarations in table 3.1 would look like within the class dec-
laration. Here’s what the code for Dictionary<TKey,TValue> might look like,
although the actual method implementations are all missing, and there are more
members in reality:
namespace System.Collections.Generic
{
public class Dictionary<TKey,TValue>
: IEnumerable<KeyValuePair<TKey,TValue>>
Declares
generic
class
Implements
generic
interface
2 It doesn’t always work exactly that way—there are corner cases that break when you apply that simple rule—
but it’s an easy way of thinking about generics that works in the vast majority of situations.


<!-- PDF page 97 -->

Parameterized typing with generics
{
public Dictionary() { ... }
Declares
parameterless
constructor
Declares
method
using type
parameters
public void Add(TKey key, TValue value) { ... }
public TValue this[TKey key]
{
get { ... }
set { ... }
}
public bool ContainsValue(TValue value) { ... }
public bool ContainsKey(TKey key) { ... }
[... other members ...]
}
}
Note how Dictionary<TKey,TValue> implements the generic interface IEnumerable
<KeyValuePair<TKey,TValue>> (and many other interfaces in real life). Whatever
type arguments you specify for the class are applied to the interface where the same
type parameters are used, so in this example, Dictionary<string,int> implements
IEnumerable<KeyValuePair<string,int>>. That’s sort of a doubly generic inter-
face—it’s
the
IEnumerable<T>
interface
with
the
structure
KeyValue-
Pair<string,int> as the type argument. It’s because it implements that interface that
listing 3.1 was able to enumerate the keys and values as it did.
It’s also worth pointing out that the constructor doesn’t list the type parameters in
angle brackets. The type parameters belong to the type rather than to the particular
constructor, so that’s where they’re declared. Members only declare type parameters
when they’re introducing new ones—and only methods can do that.
PRONOUNCING GENERICS
If you ever need to describe a generic type to a col-
league, it’s conventional to use “of” to introduce the type parameters or argu-
ments—so List<T> is pronounced “list of T,” for example. In VB, this is part
of the language: the type itself would be written as List(Of T). When there
are multiple type parameters, I find it makes sense to separate them with a
word appropriate to the meaning of the overall type, so I’d talk about a “dic-
tionary of string to int” in order to emphasize the mapping aspect, but a
“tuple of string and int.”
Generic types can effectively be overloaded on the number of type parameters, so you
could define MyType, MyType<T>, MyType<T,U>, MyType<T,U,V>, and so forth, all
within the same namespace. The names of the type parameters aren’t used when con-
sidering this—just how many there are. These types are unrelated except in name—
there’s no default conversion from one to another, for instance. The same is true for
generic methods: two methods can be exactly the same in signature other than the
number of type parameters. Although this may sound like a recipe for disaster, it can
be useful if you want to take advantage of generic type inference where the compiler can
work out some of the type arguments for you. We’ll come back to that in section 3.3.2.


<!-- PDF page 98 -->

Simple generics for everyday use
NAMING CONVENTIONS FOR TYPE PARAMETERS
Although you could have a type
with type parameters T, U, and V, it wouldn’t give much indication of what they
actually meant or how they should be used. Compare this with Dictionary
<TKey,TValue>, where it’s obvious that TKey represents the type of the keys
and TValue represents the type of the values. Where you have a single type
parameter and its meaning is clear, T is conventionally used (List<T> is a good
example of this). Multiple type parameters should usually be named
according to meaning, using the prefix T to indicate a type parameter. Every
so often, you may run into a type with multiple single-letter type parameters
(SynchronizedKeyedCollection<K,T>, for example), but you should try to
avoid creating the same situation yourself.
Now that you have an idea of what generic types do, let’s look at generic methods.
3.2.3
Generic methods and reading generic declarations
I’ve mentioned generic methods a few times, but we haven’t actually met one yet. You
may find the overall idea of generic methods more confusing than generic types—
they’re somehow less natural for the brain—but it’s the same basic principle. You’re
used to the parameters and return value of a method having firmly specified types,
and you’ve seen how a generic type can use its type parameters in method declara-
tions. Generic methods go one step further: even if you know exactly which con-
structed type you’re dealing with, an individual method can have type parameters too.
Don’t worry if you’re still none the wiser—the concept is likely to click at some point,
after you’ve seen enough examples.
Dictionary<TKey,TValue> doesn’t have any generic methods, but its close neigh-
bor List<T> does. As you can imagine, List<T> is just a list of items of whatever type is
specified—List<string> is a list of strings, for instance. Remembering that T is the
type parameter for the whole class, let’s dissect a generic method declaration.
Figure 3.2 identifies the different parts of the declaration of the ConvertAll method.
When you look at a generic declaration—whether it’s for a generic type or a
generic method—trying to work out what it means can be daunting, particularly if you
have to deal with generic types of generic types, as you did when you saw the interface
implemented by the dictionary. The key is to not panic—just take things calmly and
pick an example situation. Use a different type for each type parameter, and apply
them all consistently.
Return type
(a generic list)
Parameter name
Type parameter
List<TOutput> ConvertAll<TOutput>(Converter<T,TOutput> converter)
Parameter type (generic delegate)
Method name
Figure 3.2
The anatomy of a generic method declaration


<!-- PDF page 99 -->

Parameterized typing with generics
In this case, let’s start by replacing the type parameter of the type containing the
method (the <T> part of List<T>). We’ll stick with the concept of a list of strings and
replace T with string everywhere in the method declaration:
List<TOutput> ConvertAll<TOutput>(Converter<string,TOutput> converter)
That looks a bit better, but you’ve still got TOutput to deal with. You can tell that it’s a
method’s type parameter (apologies for the confusing terminology) because it’s in
angle brackets directly after the name of the method, so let’s try another familiar
type—Guid—as the type argument for TOutput. Again you replace the type parameter
with the type argument everywhere. You can now think of the method as if it were
nongeneric, removing the type parameter part of the declaration:
List<Guid> ConvertAll(Converter<string,Guid> converter)
Now everything is expressed in terms of a concrete type, so it’s easier to think about.
Even though the real method is generic, we’ll treat it as if it weren’t for the sake of
understanding it better. Let’s go through the elements of this declaration from left to
right:
The method returns a List<Guid>.
The method’s name is ConvertAll.
The method has a single parameter: a Converter<string,Guid>
called converter.
Now you just need to know what Converter<string,Guid> is and you’re all done. Not
surprisingly, Converter<string,Guid> is a constructed generic delegate type (the
unbound type is Converter<TInput,TOutput>), which is used to convert a string to a
GUID.
So you have a method that can operate on a list of strings, using a converter to pro-
duce a list of GUIDs. Now that you understand the method’s signature, it’s easier to
understand the documentation, which confirms that this method does the obvious
thing and creates a new List<Guid>, converts each element in the original list into the
target type, adding it to the new list, and then returns that list. Thinking about the sig-
nature in concrete terms gives you a clearer mental model, and makes it simpler to
think about what the method might do. Although this technique may sound some-
what simplistic, I find it useful for complicated methods even now. Some of the LINQ
method signatures with four type parameters are fearsome beasts, but putting them
into concrete terms tames them significantly.
Just to prove I haven’t been leading you down the garden path, let’s take a look at
the ConvertAll method in action. The following listing shows the conversion of a list
of integers into a list of floating-point numbers, where each element of the second list
is the square root of the corresponding element in the first list. After the conversion,
the results are printed.


<!-- PDF page 100 -->

Simple generics for everyday use
Listing 3.2
The List<T>.ConvertAll<TOutput> method in action
static double TakeSquareRoot(int x)
{
return Math.Sqrt(x);
}
...
List<int> integers = new List<int>();
integers.Add(1);
integers.Add(2);
integers.Add(3);
integers.Add(4);
Converter<int,double> converter = TakeSquareRoot;
List<double> doubles;
doubles = integers.ConvertAll<double>(converter);
foreach (double d in doubles)
{
Console.WriteLine(d);
}
Creates,
populates list
of integers
B
Creates delegate
instance
C
Calls generic method
to convert list
D
The creation and population of the list B is straightforward enough—it’s just a
strongly typed list of integers. The assignment to converter C uses a feature of dele-
gates (method group conversions) which is new to C# 2 and which we’ll discuss in
more detail in section 5.2. Although I don’t like using a feature before describing it
fully, the line would’ve been too long to fit on the page with the C# 1 delegate syntax.
It does what you expect it to, though. At D you call the generic method, specifying
the type argument for the method in the same way you’ve seen for generic types. This
is one situation where you could’ve used type inference to avoid explicitly specifying
the type argument, but I wanted to take it one step at a time. Writing out the list that
has been returned is simple, and when you run the code you’ll see it print 1, 1.414…,
1.732…, and 2, as expected.
What’s the point of all of this? We could’ve just used a foreach loop to go through
the integers and printed out the square root immediately, of course, but it’s not
uncommon to want to convert a list of one type to a list of another by performing
some logic on it. The code to do it manually is simple, but it’s easier to read a version
that does it in a single method call. That’s often the way with generic methods—they
often do things that previously you’d have happily done “longhand” but that are sim-
pler with a method call. Before generics, there could’ve been a similar operation to
ConvertAll on ArrayList converting from object to object, but it would’ve been a
lot less satisfactory. Anonymous methods (see section 5.4) also help here—if you
hadn’t wanted to introduce an extra method, you could’ve specified the conversion
inline. LINQ and lambda expressions take this pattern much further, as you’ll see in
part 3 of the book.
Note that generic methods can be part of nongeneric types as well. The following
listing shows a generic method being declared and used within a normal nongeneric
type.


<!-- PDF page 101 -->

Parameterized typing with generics
Listing 3.3
Implementing a generic method in a nongeneric type
static List<T> MakeList<T>(T first, T second)
{
List<T> list = new List<T>();
list.Add(first);
list.Add(second);
return list;
}
...
List<string> list = MakeList<string>("Line 1", "Line 2");
foreach (string x in list)
{
Console.WriteLine (x);
}
The MakeList<T> generic method only needs one type parameter (T). All it does is
build a list containing the two parameters. It’s worth noting that you can use T as a
type argument when you create the List<T> in the method. Just as when we were
looking at generic declarations, you can think of the implementation as (roughly
speaking) replacing all of the mentions of T with string. When you call the method,
you use the same syntax you’ve seen before to specify the type arguments.
All okay so far? You should now have the hang of simple generics. There’s a bit
more complexity to come, I’m afraid, but if you’re happy with the fundamental idea
of generics, you’ve jumped the biggest hurdle. Don’t worry if it’s still a bit hazy (partic-
ularly when it comes to the open/closed/unbound/constructed terminology), but
now would be a good time to do some experimentation so you can see generics in
action before you go any further. If you haven’t used the generic collections before,
you might want to quickly look at appendix B, which describes what’s available. The
collection types give you a simple starting point for playing with generics, and they’re
widely used in almost every nontrivial .NET program.
One thing you may find when you experiment is that it’s hard to go only part of
the way. Once you make one part of an API generic, you’ll often find that you need to
rework other code, either making that generic too or putting in the casts required by
the new, more strongly typed method calls. An alternative would be to have a strongly
typed implementation, using generic classes under the covers, but leaving a weakly
typed API for the moment. As time goes on, you’ll become more confident about
when it’s appropriate to use generics.
3.3
Beyond the basics
The relatively simple uses of generics we’ve looked at so far can get you a long way, but
there are some more features that can help you go further.
We’ll start by examining type constraints, which give you more control over which
type arguments can be specified. They’re useful when creating your own generic types
and methods, and you’ll need to understand them in order to know what options are
available when using the framework, too.


<!-- PDF page 102 -->

Beyond the basics
We’ll then examine type inference—a handy compiler trick that allows you to not
explicitly state the type arguments when you’re using generic methods. You don’t
have to use it, but it can make your code a lot easier to read when used appropriately.
You’ll see in part 3 of the book that the C# compiler is gradually being allowed to infer
a lot more information from your code, while still keeping the language safe and stati-
cally typed.3
The last part of this section deals with obtaining the default value of a type param-
eter and the comparisons that are available when you’re writing generic code. We’ll
wrap up with an example that demonstrates most of the features we’ve covered and
that’s a useful class in itself.
Although this section delves a bit deeper into generics, there’s nothing really hard
about it. There’s plenty to remember, but all the features serve a purpose, and you’ll
be grateful for them when you need them. Let’s get started.
3.3.1
Type constraints
So far, all the type parameters we’ve looked at can be applied to any type at all—
they’re unconstrained. You can have a List<int>, a Dictionary<object,FileMode>,
anything. That’s fine when you’re dealing with collections that don’t have to interact
with what they store, but not all uses of generics are like that. Often you want to call
methods on instances of the type parameter, or create new instances, or make sure
you only accept reference types (or only accept value types). In other words, you want
to specify rules that say which type arguments are considered valid for your generic
type or method. In C# 2, you do this with constraints.
Four kinds of constraints are available, and the general syntax is the same for all
of them. Constraints come at the end of the declaration of a generic method or type
and are introduced by the contextual keyword where. They can be combined
together in sensible ways, as you’ll see later. First, though, we’ll explore each kind of
constraint in turn.
REFERENCE TYPE CONSTRAINTS
The first kind of constraint ensures that the type argument used is a reference type.
It’s expressed as T : class and must be the first constraint specified for that type
parameter. The type argument can be any class, interface, array, delegate, or another
type parameter that’s already known to be a reference type. For example, consider the
following declaration:
struct RefSample<T> where T : class
Valid closed types using this declaration include

RefSample<IDisposable>

RefSample<string>

RefSample<int[]>
3 Well, aside from any C# 4 code that explicitly uses dynamic typing, anyway.


<!-- PDF page 103 -->

Parameterized typing with generics
Invalid closed types include

RefSample<Guid>

RefSample<int>
I deliberately made RefSample a struct (and therefore a value type) to emphasize the
difference between the constrained type parameter and the type itself. RefSample
<string> is still a value type with value semantics everywhere—it just happens to use
the string type wherever T is specified in the code.
When a type parameter is constrained this way, you can compare references
(including null) with == and !=, but be aware that unless there are any other con-
straints, only references will be compared, even if the type in question overloads those
operators (as string does, for example). With a conversion type constraint
(described shortly), you can end up with compiler guaranteed overloads of == and !=, in
which case those overloads are used—but that’s relatively rare.
VALUE TYPE CONSTRAINTS
The value type constraint, expressed as T : struct, ensures that the type argument
used is a value type, including enums. It excludes nullable types (as described in chap-
ter 4), though. Let’s look at an example declaration:
class ValSample<T> where T : struct
Valid closed types include

ValSample<int>

ValSample<FileMode>
Invalid closed types include

ValSample<object>

ValSample<StringBuilder>
This time ValSample is a reference type, despite T being constrained to be a value
type. Note that System.Enum and System.ValueType are both reference types in
themselves, so they aren’t allowed as valid type arguments for ValSample. When a
type parameter is constrained to be a value type, comparisons using == and != are
prohibited.
I rarely find myself using value or reference type constraints, although you’ll see in
the next chapter that nullable value types rely on value type constraints. The remain-
ing two constraints are likely to prove more useful when you’re writing your own
generic types.
CONSTRUCTOR TYPE CONSTRAINTS
The constructor type constraint is expressed as T : new() and must be the last constraint
for any particular type parameter. It simply checks that the type argument used has a
parameterless constructor that can be used to create an instance. This is the case for any
value type; for any nonstatic, nonabstract class without any explicitly declared construc-
tors; and for any nonabstract class with an explicit public parameterless constructor.


<!-- PDF page 104 -->

Beyond the basics
C# VERSUS CLI STANDARDS
There’s a discrepancy between the C# and CLI
standards when it comes to value types and constructors. The C# specification
states that all value types have a default parameterless constructor, and the
language uses the same syntax to call both explicitly declared constructors
and the parameterless one, relying on the compiler to do the right thing
underneath. The CLI specification has no such requirement but provides a
special instruction to create a default value without specifying any parame-
ters. You can see this discrepancy at work when you use reflection to find the
constructors of a value type—you won’t see a parameterless one.
Again, let’s look at a quick example, this time for a method. Just to show how it’s use-
ful, I’ll give the implementation of the method too:
public T CreateInstance<T>() where T : new()
{
return new T();
}
This method returns a new instance of whatever type you specify, provided that it has a
parameterless constructor. That means calls to CreateInstance<int>() and Create-
Instance<object>() are okay, but CreateInstance<string>() isn’t, because string
doesn’t have a parameterless constructor.
There’s no way of constraining type parameters to force other constructor signa-
tures. For instance, you can’t specify that there has to be a constructor taking a single
string parameter. It can be frustrating, but that’s unfortunately just the way it is. We’ll
look at this issue in more detail when we consider the various restrictions of .NET
generics in section 3.5.
Constructor type constraints can be useful when you need to use factory-like pat-
terns, where one object will create another one as and when it needs to. Factories
often need to produce objects that are compatible with a certain interface, of course,
and that’s where our last type of constraint comes in.
CONVERSION TYPE CONSTRAINTS
The final (and most complicated) kind of constraint lets you specify another type that
the type argument must be implicitly convertible to via an identity, reference, or box-
ing conversion. You can specify that one type argument be convertible to another type
argument, too—this is called a type parameter constraint. These constraints make it
harder to understand the declaration, but they can be handy every so often. Table 3.2
shows some examples of generic type declarations with conversion type constraints,
along with valid and invalid examples of corresponding constructed types.
The third constraint in table 3.2, T : IComparable<T>, is just one example of using
a generic type as the constraint. Other variations, such as T : List<U> (where U is
another type parameter) and T : IList<string>, are also fine.


<!-- PDF page 105 -->

Parameterized typing with generics
Table 3.2
Examples of conversion type constraints
Declaration
Constructed type examples
class Sample<T> where T : Stream
Valid: Sample<Stream> (identity conversion)
Invalid: Sample<string>
struct Sample<T> where T : IDisposable
Valid: Sample<SqlConnection>
(reference conversion)
Invalid: Sample<StringBuilder>
class Sample<T> where T : IComparable<T>
Valid: Sample<int> (boxing conversion)
Invalid: Sample<FileInfo>
class Sample<T,U> where T : U
Valid: Sample<Stream,IDisposable>
(reference conversion)
Invalid: Sample<string,IDisposable>
You can specify multiple interfaces, but only one class. For instance, this is fine (if
hard to satisfy):
class Sample<T> where T : Stream,
IEnumerable<string>,
IComparable<int>
But this isn’t:
class Sample<T> where T : Stream,
ArrayList,
IComparable<int>
No type can derive directly from more than one class anyway, so such a constraint
would usually either be impossible (like the preceding one) or part of it would be
redundant (specifying that the type had to derive from both Stream and Memory-
Stream, for example).
There’s one more set of restrictions: the type you specify can’t be a value type, a
sealed class (such as string), or any of the following “special” types:

System.Object

System.Enum

System.ValueType

System.Delegate
WORKING AROUND THE LACK OF ENUM AND DELEGATE CONSTRAINTS
The inabil-
ity to specify the preceding types in conversion type constraints sounds like
it’s due to a CLR restriction—but it’s not. That may have been true historically
(at some point when generics were still being designed), but if you construct
the appropriate code in IL, it works fine. The CLI specification even lists
enum and delegate constraints as examples and explains what would be valid
and what wouldn’t. This is frustrating, and there are plenty of generic meth-
ods that would be useful when restricted to delegates or enums. I have an


<!-- PDF page 106 -->

Beyond the basics
open source project called Unconstrained Melody (http://code.google.com/
p/unconstrained-melody/), which performs some hackery to build a class
library that does have these constraints on various utility methods. Although
the C# compiler won’t let you declare such constraints, it’s happy to apply
them when you call the methods in the library. Perhaps the prohibition will
be lifted in a future version of C#.
Conversion type constraints are probably the most useful kind, as they mean you can
use members of the specified type on instances of the type parameter. One particu-
larly handy example of this is T : IComparable<T>, which enables you to compare two
instances of T meaningfully and directly. We’ll look at an example of this (and discuss
other forms of comparison) in section 3.3.3.
COMBINING CONSTRAINTS
I’ve mentioned the possibility of having multiple constraints, and you’ve seen them in
action for conversion type constraints, but I haven’t shown the different kinds being
combined together. Obviously no type can be both a reference type and a value type,
so that combination is forbidden. Likewise, every value type has a parameterless con-
structor, so you can’t specify the construction constraint when you already have a value
type constraint (although you can still use new T() within methods if T is constrained
to be a value type). If you have multiple conversion type constraints and one of them
is a class, that has to come before the interfaces—and you can’t specify the same inter-
face more than once. Different type parameters can have different constraints, and
they’re each introduced with a separate where.
Let’s look at some valid and invalid examples:
Valid:
class Sample<T> where T : class, IDisposable, new()
class Sample<T> where T : struct, IDisposable
class Sample<T,U> where T : class where U : struct, T
class Sample<T,U> where T : Stream where U : IDisposable
Invalid:
class Sample<T> where T : class, struct
class Sample<T> where T : Stream, class
class Sample<T> where T : new(), Stream
class Sample<T> where T : IDisposable, Stream
class Sample<T> where T : XmlReader, IComparable, IComparable
class Sample<T,U> where T : struct where U : class, T
class Sample<T,U> where T : Stream, U : IDisposable
I included the last example in each list because it’s so easy to try the invalid one
instead of the valid version, and the compiler error isn’t at all helpful. Just remember
that each list of type parameter constraints needs its own introductory where. The
third valid example is interesting—if U is a value type, how can it derive from T, which
is a reference type? The answer is that T could be an object or an interface that U
implements. It’s a pretty nasty constraint, though.


<!-- PDF page 107 -->

Parameterized typing with generics
SPECIFICATION
TERMINOLOGY
The specification categorizes constraints
slightly differently—into primary constraints, secondary constraints, and con-
structor constraints. A primary constraint is a reference type constraint, a value
type constraint, or a conversion type constraint using a class. A secondary con-
straint is a conversion type constraint using an interface or another type
parameter. I don’t find these particularly useful categories, but they make it
easier to define the grammar of constraints: the primary constraint is optional
but you can only have one; you can have as many secondary constraints as you
like; the constructor constraint is optional (unless you have a value type con-
straint, in which case it’s forbidden).
Now that you know all you need to read generic type declarations, let’s look at the
type argument inference that I mentioned earlier. In listing 3.2 you explicitly stated
the type arguments to List<T>.ConvertAll, and you did the same in listing 3.3 for
the MakeList method—now let’s ask the compiler to work them out when it can, mak-
ing it simpler to call generic methods.
3.3.2
Type inference for type arguments of generic methods
Specifying type arguments when you’re calling a generic method can often seem
pretty redundant. Usually it’s obvious what the type arguments should be, based on
the method arguments themselves. To make life easier, from C# 2 onward, the com-
piler is allowed to be smart in tightly defined ways, so you can call the method without
explicitly stating the type arguments. But before we go any further, I should stress that
this is only true for generic methods. It doesn’t apply to generic types.
Let’s look at the relevant lines from listing 3.3 and see how things can be simpli-
fied. Here are the lines declaring and invoking the method:
static List<T> MakeList<T>(T first, T second)
...
List<string> list = MakeList<string>("Line 1", "Line 2");
Look at the arguments—they’re both strings. Each of the parameters in the method is
declared to be of type T. Even if you didn’t have the <string> part of the method invo-
cation expression, it would be fairly obvious that you meant to call the method using
string as the type argument for T. The compiler allows you to omit it, leaving this:
List<string> list = MakeList("Line 1", "Line 2");
That’s a bit neater, isn’t it? At least, it’s shorter. That doesn’t always mean it’s more
readable, of course. In some cases it’ll be harder for the reader to work out what type
arguments you’re trying to use, even if the compiler can do it easily. I recommend that
you judge each case on its merits. My personal preference is to let the compiler infer
the type arguments in most cases where it works.
Note how the compiler definitely knows that you’re using string as the type argu-
ment, because the assignment to list works too, and that still does specify the type
argument (and has to). The assignment has no influence on the type argument
inference process, though. It just means that if the compiler works out what type


<!-- PDF page 108 -->

Beyond the basics
arguments it thinks you want to use but gets it wrong, you’re still likely to get a
compile-time error.
How could the compiler get it wrong? Suppose you actually want to use object as
the type argument. The method parameters are still valid, but the compiler thinks you
meant to use string, as they’re both strings. Changing one of the parameters to
explicitly be cast to object makes type inference fail, as one of the method arguments
would suggest that T should be string, and the other suggests that T should be
object. The compiler could look at this and say that setting T to object would satisfy
everything but setting T to string wouldn’t, but the specification only has a limited
number of steps to follow. This subject is fairly complicated in C# 2, and C# 3 takes
things even further. I won’t try to cover all the nuts and bolts of the C# 2 rules here,
but the basic steps are as follows:
For each method argument (the bits in normal parentheses, not angle brack-
ets), try to infer some of the type arguments of the generic method, using some
fairly simple techniques.
Check that all the results from the first step are consistent. In other words, if
one argument implied one type argument for a particular type parameter, and
another implied a different type argument for the same type parameter, then
inference fails for the method call.
Check that all the type parameters needed for the generic method have been
inferred. You can’t let the compiler infer some while you specify others explic-
itly—it’s all or nothing.
To avoid learning all the rules (and I wouldn’t recommend it unless you’re particu-
larly interested in the fine details), there’s one simple thing to do: try it and see what
happens. If you think the compiler might be able to infer all the type arguments, try
calling the method without specifying any. If it fails, stick the type arguments in explic-
itly. You lose nothing more than the time it takes to compile the code once, and you
don’t need to have all the extra language-lawyer garbage in your head.
To make it easier to use generic types, type inference can be combined with the
idea of overloading type names based on the number of type parameters. We’ll look at
an example of this in a while, when we put everything together.
3.3.3
Implementing generics
You’re likely to spend more time using generic types and methods than writing them
yourself. Even when you’re providing the implementation, you can usually just pre-
tend that T (or whatever your type parameter is called) is the name of a type and get
on with writing code as if you weren’t using generics at all. But there are a few extra
things you should know.
DEFAULT VALUE EXPRESSIONS
When you know exactly what type you’re working with, you know its default value—
the value an otherwise uninitialized field would have, for instance. When you don’t


<!-- PDF page 109 -->

Parameterized typing with generics
know what type you’re referring to, though, you can’t specify that default value
directly. You can’t use null because it might not be a reference type. You can’t use 0
because it might not be a numeric type.
It’s fairly rare to need the default value, but it can be useful on occasion. Dictionary
<TKey,TValue> is a good example—it has a TryGetValue method that works a bit like
the TryParse methods on the numeric types: it uses an output parameter for the value
you’re trying to fetch and a Boolean return value to indicate whether it succeeded. This
means that the method has to have some value of type TValue to populate the output
parameter with. (Remember that output parameters must be assigned before the
method returns normally.)
THE TRYXXX PATTERN
A few patterns in .NET are easily identifiable by the
names of the methods involved—BeginXXX and EndXXX suggest an asynchro-
nous operation, for example. The TryXXX pattern is one that has had its use
expanded from .NET 1.1 to 2.0. It’s designed for situations that might nor-
mally be considered to be errors (in that the method can’t perform its pri-
mary duty), but where failure could well occur without indicating a serious
issue, and shouldn’t be deemed exceptional. For instance, users often fail to
type in numbers correctly, so being able to try to parse some text without hav-
ing to catch an exception and swallow it is useful. Not only does it improve
performance in the failure case, but more importantly, it saves exceptions for
genuine error cases where something is wrong in the system (however widely
you wish to interpret that). It’s a useful pattern to have up your sleeve as a
library designer, when applied appropriately.
C# 2 provides the default value expression to care for just this need. The specification
doesn’t refer to it as an operator, but you can think of it as being similar to the typeof
operator, just returning a different value. The following listing shows this in a generic
method, and also gives an example of type inference and a conversion type constraint
in action.
Listing 3.4
Comparing a given value to the default in a generic way
static int CompareToDefault<T>(T value)
where T : IComparable<T>
{
return value.CompareTo(default(T));
}
...
Console.WriteLine(CompareToDefault("x"));
Console.WriteLine(CompareToDefault(10));
Console.WriteLine(CompareToDefault(0));
Console.WriteLine(CompareToDefault(-10));
Console.WriteLine(CompareToDefault(DateTime.MinValue));
Listing 3.4 shows a generic method being used with three different types: string,
int, and DateTime. The CompareToDefault method dictates that it can only be used
with types implementing the IComparable<T> interface, which allows you to call


<!-- PDF page 110 -->

Beyond the basics
CompareTo(T) on the value passed in. The other value you use for the comparison is
the default value for the type. As string is a reference type, the default value is null,
and the documentation for CompareTo states that for reference types, everything
should be greater than null, so the first result is 1. The next three lines show compar-
isons with the default value of int, demonstrating that the default value is 0. The out-
put of the last line is 0, showing that DateTime.MinValue is the default value for
DateTime.
Of course, the method in listing 3.4 will fail if you pass it null as the argument—
the line calling CompareTo will throw NullReferenceException in the normal way.
Don’t worry about that for the moment—there’s an alternative using IComparer<T>,
as you’ll see soon.
DIRECT COMPARISONS
Although listing 3.4 showed how a comparison is possible, you won’t always want to con-
strain your types to implement IComparable<T> or its sister interface, IEquatable<T>,
which provides a strongly typed Equals(T) method to complement the Equals
(object) method that all types have. Without the extra information these interfaces
give you access to, there’s little you can do in terms of comparisons, other than calling
Equals(object), which will result in boxing the value you want to compare with when
it’s a value type. (There are a couple of types to help you in some situations—we’ll come
to them in a minute.)
When a type parameter is unconstrained (no constraints are applied to it), you can
use the == and != operators, but only to compare a value of that type with null; you
can’t compare two values of type T with each other. When the type argument is a refer-
ence type, the normal reference comparison will be used. In the case where the type
argument provided for T is a non-nullable value type, a comparison with null will
always decide that they’re unequal (so the comparison can be removed by the JIT
compiler). When the type argument is a nullable value type, the comparison will
behave in the natural way, making the comparison against the null value of the type.4
(Don’t worry if this last bit doesn’t make sense yet—it will when you’ve read the next
chapter. Some features are too intertwined to allow me to describe either of them
completely without referring to the other, unfortunately.)
When a type parameter is constrained to be a value type, == and != can’t be used
with it at all. When it’s constrained to be a reference type, the kind of comparison
performed depends on how the type parameter is constrained. If the only constraint
is that it’s a reference type, simple reference comparisons are performed. If it’s fur-
ther constrained to derive from a particular type that overloads the == and != opera-
tors, those overloads are used. Beware, though—extra overloads that happen to be
made available by the type argument specified by the caller are not used. The next
4 At the time of this writing (testing with .NET 4.5 and earlier), the code generated by the JIT compiler for com-
paring unconstrained type parameter values against null is extremely slow for nullable value types. If you
constrain a type parameter T to be non-nullable and then compare a value of type T? against null, that com-
parison is much faster. This shows some scope for future JIT optimization.


<!-- PDF page 111 -->

Parameterized typing with generics
listing demonstrates this with a simple reference type constraint and a type argument
of string.
Listing 3.5
Comparisons using == and != performing reference comparisons
static bool AreReferencesEqual<T>(T first, T second)
where T : class
{
return first == second;
}
...
string name = "Jon";
string intro1 = "My name is " + name;
string intro2 = "My name is " + name;
Console.WriteLine(intro1 == intro2);
Console.WriteLine(AreReferencesEqual(intro1, intro2));
Compares
references
B
Compares using
string overload
C
Even though string overloads == (as demonstrated by the comparison at C printing
True), this overload isn’t used by the comparison at B. Basically, when AreReferences-
Equal<T> is compiled, the compiler doesn’t know what overloads will be available—it’s
as if the parameters passed in were of type object.
This isn’t specific to operators—on encountering a generic type, the compiler
resolves all the method overloads when compiling the unbound generic type, rather
than reconsidering each possible method call for more specific overloads at execution
time. For instance, a statement of Console.WriteLine(default(T)); will always
resolve to a call to Console.WriteLine(object value)—it doesn’t call Console
.WriteLine(string value) when T happens to be string. This is similar to the nor-
mal situation of overloads being chosen at compile time rather than execution time,
but readers familiar with templates in C++ may be surprised nonetheless.5
Two classes that are extremely useful when it comes to comparing values are
EqualityComparer<T> and Comparer<T>, both in the System.Collections.Generic
namespace. They implement IEqualityComparer<T> and IComparer<T>, respectively,
and the Default property returns an implementation that generally does the right
thing for the appropriate type.
THE GENERIC COMPARISON INTERFACES
There are four main generic inter-
faces for comparisons. Two of them—IComparer<T> and IComparable<T>—
are about comparing values for ordering (is one value less than, equal to, or
greater than the other?), and the other two—IEqualityComparer<T> and
IEquatable<T>—are for comparing two items for equality according to some
criteria and for finding the hash of an item (in a manner compatible with the
same notion of equality).
Splitting the four another way, IComparer<T> and IEqualityComparer<T>
are implemented by types that are capable of comparing two different values,
whereas an instance of IComparable<T> or IEquatable<T> is capable of com-
paring itself with another value.
5 You’ll see in chapter 14 that dynamic typing provides the ability to resolve overloads at execution time.


<!-- PDF page 112 -->

Beyond the basics
See the documentation for more details, and consider using these (and similar types
such as StringComparer) when performing comparisons. We’ll use Equality-
Comparer<T> in the next example.
FULL COMPARISON EXAMPLE: REPRESENTING A PAIR OF VALUES
To finish off our section on implementing generics, here’s a complete example. It
implements a useful generic type—a Pair<T1,T2> that holds two values together, like
a key/value pair, but with no expectations as to the relationship between the two values.
.NET 4 AND TUPLES
.NET 4 provides a lot of this functionality out of the box—
and for many different numbers of type parameters, too. Look for Tuple<T1>,
Tuple<T1,T2>, and so on in the System namespace.
In addition to providing properties to access the values themselves, you’ll override
Equals and GetHashCode to allow instances of your type to play nicely when used as
keys in a dictionary. The following listing gives the complete code.
Listing 3.6
Generic class representing a pair of values
using System;
using System.Collections.Generic;
public sealed class Pair<T1, T2> : IEquatable<Pair<T1, T2>>
{
private static readonly IEqualityComparer<T1> FirstComparer =
EqualityComparer<T1>.Default;
private static readonly IEqualityComparer<T2> SecondComparer =
EqualityComparer<T2>.Default;
private readonly T1 first;
private readonly T2 second;
public Pair(T1 first, T2 second)
{
this.first = first;
this.second = second;
}
public T1 First { get { return first; } }
public T2 Second { get { return second; } }
public bool Equals(Pair<T1, T2> other)
{
return other != null &&
FirstComparer.Equals(this.First, other.First) &&
SecondComparer.Equals(this.Second, other.Second);
}
public override bool Equals(object o)
{
return Equals(o as Pair<T1, T2>);
}


<!-- PDF page 113 -->

Parameterized typing with generics
public override int GetHashCode()
{
return FirstComparer.GetHashCode(first) * 37 +
SecondComparer.GetHashCode(second);
}
}
Listing 3.6 is straightforward. The constituent values are stored in appropriately typed
member variables, and access is provided by simple read-only properties. You imple-
ment IEquatable<Pair<T1,T2>> to give a strongly typed API that’ll avoid unnecessary
execution-time checks. The equality and hash-code computations both use the default
equality comparer for the two type parameters—these handle nulls automatically,
which makes the code somewhat simpler. The static variables used to store the equal-
ity comparers for T1 and T2 are mostly there for the sake of formatting the code for
the printed page, but they’ll also be useful as a reference point in the next section.
CALCULATING HASH CODES The formula used for calculating the hash code
based on the two “part” results comes from Effective Java, 2nd edition (Addi-
son-Wesley, 2008), by Joshua Bloch. It certainly doesn’t guarantee a good dis-
tribution of hash codes, but in my opinion it’s better than using a bitwise
exclusive OR. See Effective Java for more details, and for many other useful tips
and design insights.
Now that you have your Pair class, how do you construct an instance of it? At the
moment, you’d need to use something like this:
Pair<int,string> pair = new Pair<int,string>(10, "value");
That’s not terribly nice. It would be good to use type inference, but that only works for
generic methods, and you don’t have any of those. If you put a generic method in the
generic type, you’d still need to specify the type arguments for the type before you
could call a method on it, which would defeat the purpose. The solution is to use a
nongeneric helper class with a generic method in it, as shown in the following listing.
Listing 3.7
Using a nongeneric type with a generic method to enable type inference
public static class Pair
{
public static Pair<T1,T2> Of<T1,T2>(T1 first, T2 second)
{
return new Pair<T1,T2>(first, second);
}
}
If this is your first time reading this book, ignore the fact that the class is declared to
be static—we’ll come to that in chapter 7. The important point is that you have a non-
generic class with a generic method. That means you can turn the previous example
into this far-more-pleasant version:
Pair<int,string> pair = Pair.Of(10, "value");


<!-- PDF page 114 -->

Advanced generics
In C# 3 you could even dispense with the explicit typing of the pair variable, but let’s
not get ahead of ourselves. This use of nongeneric helper classes (or partially generic
helper classes, if you have two or more type parameters and want to infer some of
them but leave others explicit) is a handy trick.
We’ve finished looking at the intermediate features now. I realize it can all seem
complicated at first, but don’t be put off; the benefits of generics far outweigh the
added complexity. Over time, they become second nature. Now that you have the
Pair class as an example, it might be worth looking over your own code base to see
whether there are some patterns that you keep reimplementing solely to use differ-
ent types.
In any large topic there’s always more to learn. The next section will take you
through the most important advanced topics in generics. If you’re feeling over-
whelmed at this point, you might want to skip to the relative comfort of section 3.5,
where we’ll explore some of the limitations of generics. It’s worth understanding the
topics in the next section eventually, but if everything so far has been new to you, it
won’t hurt to skip it for the moment.
3.4
Advanced generics
You may expect me to claim that in the rest of this chapter we’ll cover every aspect of
generics that we haven’t looked at so far. But there are so many little nooks and cran-
nies involving generics that it’s simply not possible—and I certainly wouldn’t want to
read about all the details, let alone write about them. Fortunately, the nice people at
Microsoft and ECMA have written down all the details in the language specification, so
if you ever want to check some obscure situation that isn’t covered here, that should
be your next port of call. Unfortunately I can’t point to one particular area of the
specification that covers generics: they pop up almost everywhere. Arguably, if your
code ends up in a corner case so complicated that you need to consult the specifica-
tion to work out what it should do, you should refactor it into a more obvious form
anyway; you don’t want each maintenance engineer from now until eternity to have to
read the gory details.
My aim with this section is to cover everything you’re likely to want to know about
generics. I’ll talk more about the CLR and the framework side of things than the par-
ticular syntax of the C# 2 language, although it’s all relevant when developing in C#.
We’ll start by considering static members of generic types, including type initializa-
tion. From there, it’s a natural step to wonder how all this is implemented under the
covers, but we’ll keep it fairly light on detail, concentrating on the important effects of
the implementation decisions. We’ll look at what happens when you enumerate a
generic collection using foreach in C# 2, and round off the section by seeing how
reflection in the .NET Framework is affected by generics.


<!-- PDF page 115 -->

Parameterized typing with generics
3.4.1
Static fields and static constructors
Just as instance fields belong to an instance, static fields belong to the type they’re
declared in. If you declare a static field x in class SomeClass, there’s exactly one Some-
Class.x field, no matter how many instances of SomeClass you create, and no matter
how many types derive from SomeClass.6 That’s the familiar scenario from C# 1—so
how does it map across to generics?
The answer is that each closed type has its own set of static fields. You saw this in list-
ing 3.6 when you stored the default equality comparers for T1 and T2 in static fields,
but let’s look at it in more detail with another example. The following listing creates a
generic type including a static field. You set the field’s value for different closed types
and then print out the values to show that they’re separate.
Listing 3.8
Proof that different closed types have different static fields
class TypeWithField<T>
{
public static string field;
public static void PrintField()
{
Console.WriteLine(field + ": " + typeof(T).Name);
}
}
...
TypeWithField<int>.field = "First";
TypeWithField<string>.field = "Second";
TypeWithField<DateTime>.field = "Third";
TypeWithField<int>.PrintField();
TypeWithField<string>.PrintField();
TypeWithField<DateTime>.PrintField();
You set the value of each field to a different value and then print out each field along
with the name of the type argument used for that closed type. Here’s the output from
listing 3.8:
First: Int32
Second: String
Third: DateTime
The basic rule is one static field per closed type. The same applies for static initializers
and static constructors. But it’s possible to have one generic type nested within
another, and types with multiple generic parameters. This sounds a lot more compli-
cated, but it works as you probably think it should. The following listing shows this in
action, this time using static constructors to show just how many types there are.
6 Well, there’s one per application domain. For the purposes of this section, we’ll assume we’re only dealing
with one application domain. The concepts for different application domains work the same with generics as
with nongeneric types. Variables decorated with [ThreadStatic] violate this rule, too.


<!-- PDF page 116 -->

Advanced generics
Listing 3.9
Static constructors with nested generic types
public class Outer<T>
{
public class Inner<U,V>
{
static Inner()
{
Console.WriteLine("Outer<{0}>.Inner<{1},{2}>",
typeof(T).Name,
typeof(U).Name,
typeof(V).Name);
}
public static void DummyMethod() {}
}
}
...
Outer<int>.Inner<string,DateTime>.DummyMethod();
Outer<string>.Inner<int,int>.DummyMethod();
Outer<object>.Inner<string,object>.DummyMethod();
Outer<string>.Inner<string,object>.DummyMethod();
Outer<object>.Inner<object,string>.DummyMethod();
Outer<string>.Inner<int,int>.DummyMethod();
The first call to DummyMethod() for any type will cause the type to be initialized, at
which point the static constructor prints out some diagnostics. Each different list of
type arguments counts as a different closed type, so the output of listing 3.9 looks like
this:
Outer<Int32>.Inner<String,DateTime>
Outer<String>.Inner<Int32,Int32>
Outer<Object>.Inner<String,Object>
Outer<String>.Inner<String,Object>
Outer<Object>.Inner<Object,String>
Just as with nongeneric types, the static constructor for any closed type is only exe-
cuted once, which is why the last line of listing 3.9 doesn’t create a sixth line of out-
put—the static constructor for Outer<string>.Inner<int,int> executed earlier,
producing the second line of output.
To clear up any doubts, if you had a nongeneric PlainInner class inside Outer,
there still would’ve been one possible Outer<T>.PlainInner type per closed Outer
type, so Outer<int>.PlainInner would be separate from Outer<long>.PlainInner,
with a separate set of static fields, as seen earlier.
Now that you’ve seen what constitutes a different type, we should look at what the
effects of that might be in terms of the amount of native code generated. And no, it’s
not as bad as you might think…
3.4.2
How the JIT compiler handles generics
Given that we have all of these different closed types, the JIT’s job is to convert the IL
of the generic type into native code so it can actually be run. In some ways, you


<!-- PDF page 117 -->

Parameterized typing with generics
shouldn’t care exactly how it does that—beyond keeping a close eye on memory and
CPU time, you wouldn’t see much difference if the JIT took the simplest possible
approach and generated native code for each closed type separately, as if each one
had nothing to do with any other type. But the JIT authors are clever enough that it’s
worth looking at what they’ve done.
Let’s start with a simple situation first, with a single type parameter—we’ll use
List<T> for the sake of convenience. The JIT creates different code for each closed
type with a type argument that’s a value type—int, long, Guid, and the like. But it
shares the native code generated for all the closed types that use a reference type as the
type argument, such as string, Stream, and StringBuilder. It can do this because all
references are the same size (the size varies between a 32-bit CLR and a 64-bit CLR, but
within any one CLR all references are the same size). An array of references will always
be the same size, whatever the references happen to be. The space required on the
stack for a reference will always be the same. The JIT can use the same optimizations to
store references in registers regardless of the type—the List<Reason> goes on.
Each of the types still has its own static fields, as described in section 3.4.1, but the
executable code itself is reused. Of course, the JIT does all of this lazily—it won’t gen-
erate the code for List<int> before it needs to, and it’ll cache that code for all future
uses of List<int>.
In theory, it’s possible to share code for at least some value types. The JIT would
have to be careful, not just due to size, but also for garbage collection reasons—it
would have to be able to quickly identify areas of a struct value that are live references.
But value types that are the same size and have the same in-memory footprint as far as
the garbage collector is concerned could share code. At the time of this writing, that’s
been of sufficiently low priority that it hasn’t been implemented, and it may well stay
that way.
This level of detail is primarily of academic interest, but it does have a slight perfor-
mance impact in terms of more code being JIT compiled. The performance benefits of
generics can be huge, though, and again that comes down to having the opportunity to
compile to different code for different types. Consider a List<byte>, for instance. In
.NET 1.1, adding individual bytes to an ArrayList would’ve meant boxing each one of
them and storing a reference to each boxed value. Using List<byte> has no such
impact—List<T> has a member of type T[] to replace the object[] within ArrayList,
and that array is of the appropriate type, taking the appropriate space. List<byte> has
a straight byte[] within it used to store the elements of the array. (In many ways, this
makes a List<byte> behave like a MemoryStream.)
Figure 3.3 shows an ArrayList and a List<byte>, each with the same six values.
The arrays themselves have more than six elements, to allow for growth. Both List<T>
and ArrayList have a buffer, and they create a larger buffer when they need to.
The difference in efficiency here is incredible. Let’s look at the ArrayList first, con-
sidering a 32-bit CLR.7 Each of the boxed bytes will take up 8 bytes of object overhead,
7 When running on a 64-bit CLR, the overheads are bigger.


<!-- PDF page 118 -->

Advanced generics
Boxed
bytes
byte[]
ArrayList
object[]
List<byte>
![Figure from PDF page 118](images/page-118-figure-0064.png)

![Figure from PDF page 118](images/page-118-figure-0065.png)

![Figure from PDF page 118](images/page-118-figure-0066.png)

![Figure from PDF page 118](images/page-118-figure-0067.png)

![Figure from PDF page 118](images/page-118-figure-0068.png)

![Figure from PDF page 118](images/page-118-figure-0069.png)

ref
elements
elements
![Figure from PDF page 118](images/page-118-figure-0070.png)

ref
ref
![Figure from PDF page 118](images/page-118-figure-0071.png)

ref
ref
![Figure from PDF page 118](images/page-118-figure-0072.png)

![Figure from PDF page 118](images/page-118-figure-0073.png)

count
count
ref
ref
![Figure from PDF page 118](images/page-118-figure-0074.png)

![Figure from PDF page 118](images/page-118-figure-0075.png)

ref
![Figure from PDF page 118](images/page-118-figure-0076.png)

![Figure from PDF page 118](images/page-118-figure-0077.png)

...
...
![Figure from PDF page 118](images/page-118-figure-0078.png)

![Figure from PDF page 118](images/page-118-figure-0079.png)

Figure 3.3
Visual demonstration of why List<T> takes up a lot less space than ArrayList
when storing value types
plus 4 bytes (1 byte, rounded up to a word boundary) for the data itself. On top of that,
you have all the references themselves, each of which takes up 4 bytes. So for each byte
of useful data, you’re paying at least 16 bytes—and then there’s the extra unused space
for references in the buffer.
Compare this with the List<byte>. Each byte in the list takes up a single byte
within the elements array. There’s still wasted space in the buffer, waiting to be used by
new items, but at least you’re only wasting a single byte per unused element there.
You don’t just gain space, you gain execution speed, too. You save the time taken to
allocate the box, to perform the type checking involved in unboxing the bytes in order
to get at them, and to garbage collect the boxes when they’re no longer referenced.
You don’t have to go down to the CLR level to find things happening transparently
on your behalf, though. C# has always made life easier with syntactic shortcuts, and
the next section looks at a familiar example but with a generic twist: iterating with
foreach.
3.4.3
Generic iteration
One of the most common operations you’ll want to perform on a collection is to iter-
ate through all its elements. Usually, the simplest way of doing that is to use the
foreach statement. In C# 1, this relied on the collection either implementing the
System.Collections.IEnumerable interface or having a similar GetEnumerator()
method that returned a type with a suitable MoveNext() method and a Current prop-
erty. The Current property didn’t have to be of type object, and that was the whole


<!-- PDF page 119 -->

Parameterized typing with generics
point of having these extra rules, which look odd at first sight. Yes, even in C# 1 you
could avoid boxing and unboxing during iteration if you had a custom iteration type.
C# 2 makes this somewhat easier, as the rules for the foreach statement have been
extended to also use the System.Collections.Generic.IEnumerable<T> interface
along with its partner, IEnumerator<T>. These are simply the generic equivalents of
the old iteration interfaces, and they’re used in preference to the nongeneric ver-
sions. This means that if you iterate through a generic collection of value type ele-
ments—List<int>, for example—then no boxing is performed at all. If the old
interface had been used instead, you wouldn’t have incurred the boxing cost while
storing the elements of the list, but you’d still have ended up boxing them when you
retrieved them using foreach.
All of this is done for you under the covers—all you need to do is use the foreach
statement in the normal way, using an appropriate type for the iteration variable, and
all will be well. That’s not the end of the story, though. In the relatively rare situation
where you need to implement iteration over one of your own types, you’ll find that
IEnumerable<T> extends the old IEnumerable interface, which means you have to
implement two different methods:
IEnumerator<T> GetEnumerator();
IEnumerator GetEnumerator();
Can you see the problem? The methods differ only in return type, and the overloading
rules of C# prevent you from writing two such methods normally. Back in section 2.2.2,
you saw a similar situation, and you can use the same workaround here. If you imple-
ment IEnumerable using explicit interface implementation, you can implement
IEnumerable<T> with a “normal” method. Fortunately, because IEnumerator<T>
extends IEnumerator, you can use the same return value for both methods and imple-
ment the nongeneric method by just calling the generic version. Of course, now you
need to implement IEnumerator<T> and you quickly run into similar problems, this
time with the Current property.
The following listing gives a full example, implementing an enumerable class that
always enumerates the integers 0 to 9.
Listing 3.10
A full generic iterator—of the numbers 0 to 9
class CountingEnumerable: IEnumerable<int>
{
public IEnumerator<int> GetEnumerator()
{
return new CountingEnumerator();
}
Implements
IEnumerable<T>
implicitly
B
IEnumerator IEnumerable.GetEnumerator()
{
return GetEnumerator();
}
}
Implements
IEnumerable
explicitly
C


<!-- PDF page 120 -->

Advanced generics
class CountingEnumerator : IEnumerator<int>
{
int current = -1;
public bool MoveNext()
{
current++;
return current < 10;
}
Implements
IEnumerator<T>.Current
implicitly
D
public int Current { get { return current; } }
object IEnumerator.Current { get { return Current; } }
public void Reset()
{
current = -1;
}
public void Dispose() {}
}
...
CountingEnumerable counter = new CountingEnumerable();
foreach (int x in counter)
{
Console.WriteLine(x);
}
Implements
IEnumerator.Current
explicitly E
Proves that
enumerable
type works
F
Clearly these results aren’t particularly useful, but the code shows the little hoops you
have to go through in order to implement generic iteration appropriately—at least if
you’re doing it all longhand. (And that’s without making an effort to throw excep-
tions if Current is accessed at an inappropriate time.) If you think that listing 3.10
looks like a lot of work just to print out the numbers 0 to 9, I can’t help but agree with
you, and there’d be even more code if you wanted to iterate over anything useful. For-
tunately, you’ll see in chapter 6 that C# 2 takes a large amount of the work away from
iterators in many cases. I’ve shown the full version here so you can appreciate the
slight wrinkles that have been introduced by the design decision for IEnumerable<T>
to extend IEnumerable. I’m not suggesting it was the wrong decision, though; it allows
you to pass any IEnumerable<T> into a method written in C# 1 with an IEnumerable
parameter. That’s not as important now as it was back in 2005, but it’s still a useful
transition path.
You only need the trick of using explicit interface implementation twice—once
for IEnumerable.GetEnumerator C and once for IEnumerator.Current E. Both of
these call their generic equivalents (B and D, respectively). Another addition to
IEnumerator<T> is that it extends IDisposable, so you have to provide a Dispose
method. The foreach statement in C# 1 already called Dispose on an iterator if it
implemented IDisposable, but in C# 2 no execution-time testing is required—if the
compiler finds that you’ve implemented IEnumerable<T>, it creates an unconditional
call to Dispose at the end of the loop (in a finally block). Many iterators won’t actu-
ally need to dispose of anything, but it’s nice to know that when it is required, the most
common way of working through an iterator (the foreach statement F) handles the


<!-- PDF page 121 -->

Parameterized typing with generics
calling side automatically. This is most commonly used to release resources when
you’ve finished iterating. For example, you might have an iterator that reads lines from
a file and needs to close the file handle when the calling code has finished looping.
We’ll now go from compile-time efficiency to execution-time flexibility: our final
advanced topic is reflection. Even in .NET 1.0/1.1, reflection could be tricky, but
generic types and methods introduce an extra level of complexity. The framework
provides everything you need (with a bit of helpful syntax from C# 2 as a language),
and although the additional considerations can be daunting, it’s not too bad if you
take it one step at a time.
3.4.4
Reflection and generics
Reflection is used by different people for all sorts of things. You might use it for
execution-time introspection of objects to perform a simple form of data binding. You
might use it to inspect a directory full of assemblies to find implementations of a plug-
in interface. You might write a file for an inversion of control framework (see
www.martinfowler.com/articles/injection.html) to load and dynamically configure
your application’s components. As the uses of reflection are so diverse, I won’t focus
on any particular one but will instead give you more general guidance on performing
common tasks. We’ll start by looking at the extensions to the typeof operator.
USING TYPEOF WITH GENERIC TYPES
Reflection is all about examining objects and their types. As such, one of the most
important things you need to be able to do is obtain a reference to a particular
System.Type object, which allows access to all the information about that type. C#
uses the typeof operator to obtain such a reference for types known at compile time,
and this has been extended to encompass generic types.
There are two ways of using typeof with generic types—one retrieves the generic
type definition (in other words, the unbound generic type) and one retrieves a particu-
lar constructed type. To obtain the generic type definition—the type with none of the
type arguments specified—you simply take the name of the type as it would’ve been
declared and remove the type parameter names, keeping any commas. To retrieve
constructed types, you specify the type arguments in the same way as you would to
declare a variable of the generic type. The next listing gives an example of both uses.
It uses a generic method so we can revisit how typeof can be used with a type parame-
ter, which we previously saw in 3.8.
Listing 3.11
Using the typeof operator with type parameters
static void DemonstrateTypeof<X>()
{
Console.WriteLine(typeof(X));
Displays method’s
type parameter
Console.WriteLine(typeof(List<>));
Console.WriteLine(typeof(Dictionary<,>));
Displays generic types
Displays closed types (despite
using type parameter)
B
Console.WriteLine(typeof(List<X>));


<!-- PDF page 122 -->

Advanced generics
Console.WriteLine(typeof(Dictionary<string,X>));
Console.WriteLine(typeof(List<long>));
Console.WriteLine(typeof(Dictionary<long,Guid>));
}
...
DemonstrateTypeof<int>();
Displays closed types
Most of listing 3.11 works as you might naturally expect, but it’s worth pointing out
two things. First, look at the syntax for obtaining the generic type definition of Dic-
tionary <TKey,TValue>. The comma in the angle brackets is required to tell the
compiler to look for the type with two type parameters; remember that there can be
several generic types with the same name, as long as they vary by the number of type
parameters they have. Similarly, you’d retrieve the generic type definition for MyClass
<T1,T2,T3,T4> using typeof(MyClass<,,,>). The number of type parameters is
specified in IL (and in full type names as far as the framework is concerned) by put-
ting a back tick after the first part of the type name and then the number. The type
parameters are then indicated in square brackets instead of the angle brackets we’re
used to. For instance, the second line printed ends with List`1[T], showing that
there’s one type parameter, and the third line includes Dictionary`2[TKey,TValue].
Second, note that wherever the method’s type parameter (X) is used, the actual
value of the type argument is used at execution time. So this line B prints
List`1[System. Int32] rather than List`1[X], which you might have expected.8 In
other words, a type that’s open at compile time may be closed at execution time. This
is very confusing. You should be aware of it in case you don’t get the results you expect, but other-
wise, don’t worry. To retrieve a truly open constructed type at execution time, you need
to work a bit harder. See the MSDN documentation for Type.IsGenericType for a suit-
ably convoluted example (http://mng.bz/9W6O).
For reference, here’s the output of listing 3.11:
System.Int32
System.Collections.Generic.List`1[T]
System.Collections.Generic.Dictionary`2[TKey,TValue]
System.Collections.Generic.List`1[System.Int32]
System.Collections.Generic.Dictionary`2[System.String,System.Int32]
System.Collections.Generic.List`1[System.Int64]
System.Collections.Generic.Dictionary`2[System.Int64,System.Guid]
Having retrieved an object representing a generic type, there are many next steps you
can take. All the previously available ones (finding the members of the type, creating
an instance, and so on) are still present—although some aren’t applicable for generic
type definitions—and there are new ones as well that let you inquire about the generic
nature of the type.
8 I deliberately bucked the convention of using a type parameter named T, precisely so that we could tell the
difference between the T in the List<T> declaration and the X in our method declaration.


<!-- PDF page 123 -->

Parameterized typing with generics
METHODS AND PROPERTIES OF SYSTEM.TYPE
There are far too many new methods and properties to look at them all in detail, but
there are two particularly important ones: GetGenericTypeDefinition and Make-
GenericType. They’re effectively opposites—the first acts on a constructed type,
retrieving the generic type definition; the second acts on a generic type definition and
returns a constructed type. Arguably it would’ve been clearer if this method had been
called ConstructType, MakeConstructedType, or some other name with construct or
constructed in it, but we’re stuck with what we’ve got.
Just like normal types, there’s only one Type object for any particular type—so call-
ing MakeGenericType twice with the same types as arguments will return the same ref-
erence twice. Similarly, calling GetGenericTypeDefinition on two types constructed
from the same generic type definition will give the same result for both calls, even if
the constructed types are different (such as List<int> and List<string>).
Two other methods worth exploring—this time methods that already existed in
.NET 1.1—are Type.GetType(string) and its related Assembly.GetType(string)
method, both of which provide a dynamic equivalent to typeof. You might expect to
be able to feed each line of the output of listing 3.11 to the GetType method called on
an appropriate assembly, but unfortunately life isn’t quite that straightforward. It’s
fine for closed constructed types—the type arguments just go in square brackets. For
generic type definitions, though, you need to remove the square brackets entirely—
otherwise GetType thinks you mean an array type. The following listing shows all of
these methods in action.
Listing 3.12
Various ways of retrieving generic and constructed Type objects
string listTypeName = "System.Collections.Generic.List`1";
Type defByName = Type.GetType(listTypeName);
Type closedByName = Type.GetType(listTypeName + "[System.String]");
Type closedByMethod = defByName.MakeGenericType(typeof(string));
Type closedByTypeof = typeof(List<string>);
Console.WriteLine(closedByMethod == closedByName);
Console.WriteLine(closedByName == closedByTypeof);
Type defByTypeof = typeof(List<>);
Type defByMethod = closedByName.GetGenericTypeDefinition();
Console.WriteLine(defByMethod == defByName);
Console.WriteLine(defByName == defByTypeof);
The output of listing 3.12 is just True four times, validating that however you obtain a
reference to a particular type object, only one such object is involved.
As I mentioned earlier, there are many new methods and properties on Type, such
as GetGenericArguments, IsGenericTypeDefinition, and IsGenericType. Again, the
documentation for IsGenericType is probably the best starting point for further
exploration.


<!-- PDF page 124 -->

Advanced generics
REFLECTING GENERIC METHODS
Generic methods have a similar (though smaller) set of additional properties and
methods. The following listing gives a brief demonstration of this, calling a generic
method by reflection.
Listing 3.13
Retrieving and invoking a generic method with reflection
public static void PrintTypeParameter<T>()
{
Console.WriteLine(typeof(T));
}
...
Type type = typeof(Snippet);
MethodInfo definition = type.GetMethod("PrintTypeParameter");
MethodInfo constructed = definition.MakeGenericMethod(typeof(string));
constructed.Invoke(null, null);
First you retrieve the generic method definition, and then you make a constructed
generic method using MakeGenericMethod. As with types, you could go the other way
if you wanted to, but unlike Type.GetType, there’s no way of specifying a constructed
method in the GetMethod call. The framework also has a problem if methods are over-
loaded purely by number of type parameters—there are no methods in Type that
allow you to specify the number of type parameters, so instead you’d have to call
Type.GetMethods and find the right one by looking through all the methods.
After retrieving the constructed method, you invoke it. The arguments in this
example are both null, as you’re invoking a static method that doesn’t have any nor-
mal parameters. The output is System.String, as you’d expect. Note that the meth-
ods retrieved from generic type definitions can’t be invoked directly—instead, you
must get the methods from a constructed type. This applies to both generic and non-
generic methods.
SAVED BY C# 4
If all of this looks messy to you, I agree. Fortunately, in many
cases C#’s dynamic typing can come to the rescue, taking a lot of the work out
of generic reflection. It doesn’t help in all situations, so it’s worth being aware
of the general flow of the preceding code, but where it does apply it’s great.
We’ll look at dynamic typing in detail in chapter 14.
Again, more methods and properties are available on MethodInfo, and IsGeneric-
Method is a good starting point in MSDN (http://mng.bz/P36u). Hopefully the infor-
mation in this section will have been enough to get you going, and to point out some
of the added complexities you might not have otherwise anticipated when first start-
ing to access generic types and methods with reflection.
That’s all we’ll cover in the way of advanced features. Just to reiterate, this chapter
isn’t meant to be a complete guide to generics by any means, but most developers are
unlikely to need to know the more obscure details. I hope for your sake that you fall
into this camp, as specifications tend to get harder to read the deeper you go into
them. Remember that unless you’re developing alone and just for yourself, you’re


<!-- PDF page 125 -->

Parameterized typing with generics
unlikely to be the only one to work on your code. If you need features that are more
complex than the ones demonstrated here, you should assume that anyone reading
your code will need help to understand it. On the other hand, if you find that your co-
workers don’t know about some of the topics we’ve covered so far, please feel free to
direct them to the nearest bookshop…
Our final main section of the chapter looks at some of the limitations of generics
in C# and considers similar features in other languages.
3.5
Limitations of generics in C# and other languages
There’s no doubt that generics contribute a great deal to C# in terms of expressive-
ness, type safety, and performance. The feature has been carefully designed to cope
with most of the tasks that C++ programmers typically used templates for, but without
some of the accompanying disadvantages. But this isn’t to say limitations don’t exist.
There are some problems that C++ templates solve with ease but that C# generics
can’t help with. Similarly, though generics in Java are generally less powerful than in
C#, there are some concepts that can be expressed in Java but that don’t have a C#
equivalent. This section will take you through some of the most commonly encoun-
tered weaknesses, and I’ll briefly compare the C#/.NET implementation of generics
with C++ templates and Java generics.
It’s important to stress that pointing out these snags doesn’t imply that they
should’ve been avoided in the first place. In particular, I’m in no way saying that I
could’ve done a better job! The language and platform designers have had to balance
power with complexity (and the small matter of achieving both design and implemen-
tation within a reasonable time scale). Most likely, you won’t encounter problems, and
if you do, you’ll be able to work around them with the guidance given here.
We’ll start with the answer to a question that almost everyone raises sooner or later:
Why can’t I convert a List<string> to a List<object>?
3.5.1
Lack of generic variance
In section 2.2.2, we looked at the covariance of arrays—the fact that an array of a refer-
ence type can be viewed as an array of its base type, or an array of any of the interfaces
it implements. There are actually two forms of this idea, called covariance and contra-
variance, or collectively just variance. Generics don’t support this—they’re invariant.
This is for the sake of type safety, as you’ll see, but it can be annoying.
One thing I’d like to make clear to start with: C# 4 improves the generic variance
situation somewhat. Many of the restrictions listed here do still apply though, and this
section serves as a useful introduction to the idea of variance. We’ll see how C# 4 helps
in chapter 13, but many of the clearest examples of generic variance rely on other new
features from C# 3, including LINQ. Variance is also quite a complicated topic in itself,
so it’s worth waiting until you’re comfortable with the rest of C# 2 and 3 before you
tackle it. For the sake of readability, I won’t point out every place in this section that’s
slightly different in C# 4…it’ll all become clear in chapter 13.


<!-- PDF page 126 -->

Limitations of generics in C# and other languages
WHY DON’T GENERICS SUPPORT COVARIANCE?
Suppose you have two classes, Turtle and Cat, both of which derive from an abstract
Animal class. In the code that follows, the array code (first block) is valid C# 2; the
generic code (second block) isn’t.
Valid (at compile time)
Invalid
Animal[] animals = new Cat[5];
animals[0] = new Turtle();
List<Animal> animals = new List<Cat>();
animals.Add(new Turtle());
The compiler has no problem with the second line in either case, but the first line
under Invalid causes the following error:
error CS0029: Cannot implicitly convert type
'System.Collections.Generic.List<Cat>' to
'System.Collections.Generic.List<Animal>'
This was a deliberate choice on the part of the framework and language designers.
The obvious question to ask is why this is prohibited, and the answer lies in the second
line.
There’s nothing about the second line that should raise any suspicion. After all,
List<Animal> effectively has a method with the signature void Add(Animal value)—
you should be able to put a Turtle into any list of animals, for instance. But the actual
object referred to by animals is a Cat[] (in the code under Valid) or a List<Cat>
(under Invalid), both of which require that only references to instances of Cat (or fur-
ther subclasses) are stored in them. Although the array version will compile, it’ll fail at
execution time. This was deemed by the designers of generics to be worse than failing
at compile time, which is reasonable—the whole point of static typing is to find out
about errors before the code ever gets run.
WHY ARE ARRAYS COVARIANT?
Having answered the question about why
generics are invariant, the next obvious step is to question why arrays are cova-
riant. According to the Common Language Infrastructure Annotated Standard
(Miller and Ragsdale, Addison-Wesley Professional, 2003), for the first version
of .NET the designers wanted to reach as broad an audience as possible, which
included being able to run code compiled from Java source. In other words,
.NET has covariant arrays because Java has covariant arrays—despite this
being a known wart in Java.
So, that’s why things are the way they are—but why should you care, and how can you
get around the restriction?
WHERE COVARIANCE WOULD BE USEFUL
The example I’ve given with a list is clearly problematic. You can add items to the list,
which is where you lose the type safety in this case, and an add operation is an exam-
ple of a value being used as an input into the API: the caller is supplying the value.
What would happen if you limited yourself to getting values out?


<!-- PDF page 127 -->

Parameterized typing with generics
The obvious examples of this are IEnumerator<T> and (by association)
IEnumerable<T>. In fact, these are almost the canonical examples for generic covari-
ance. Together they describe a sequence of values—all you know about the values you
see is that each one will be compatible with T, such that you can always write
T currentValue = iterator.Current;
This uses the normal idea of compatibility—it would be fine for an IEnumerator
<Animal> to yield references to instances of Cat or Turtle, for example. There’s no
way you can push values that are inappropriate for the actual sequence type, so you’d
like to be able to treat an IEnumerator<Cat> as an IEnumerator<Animal>. Let’s con-
sider an example of where that might be useful.
Suppose you take the customary shape example for inheritance, but using an inter-
face (IShape). Now consider another interface, IDrawing, that represents a drawing
made up of shapes. You’ll have two concrete types of drawing—a MondrianDrawing
(made of rectangles) and a SeuratDrawing (made of circles).9 Figure 3.4 shows the
class hierarchies involved.
Both drawing types need to implement the IDrawing interface, so they need to
expose a property with this signature:
IEnumerable<IShape> Shapes { get; }
But each drawing type would probably find it easier to maintain a more strongly typed
list internally. For example, a Seurat drawing may include a field of type
List<Circle>. It’s useful for it to have this rather than a List<IShape> so that if it
needs to manipulate the circles in a circle-specific way, it can do so without casting. If
you had a List<IShape>, you could either return it directly or at least wrap it in a
ReadOnlyCollection<IShape> to prevent callers from messing with it via casting—the
property implementation would be cheap and simple either way. But you can’t do that
when your types don’t match up. You can’t convert from an IEnumerable<Circle> to
an IEnumerable<IShape>. So what can you do?
![Figure from PDF page 127](images/page-127-figure-0080.png)

![Figure from PDF page 127](images/page-127-figure-0081.png)

<<interface>>
IShape
![Figure from PDF page 127](images/page-127-figure-0082.png)

<<interface>>
IDrawing
+Shapes: IEnumerable<IShape>
![Figure from PDF page 127](images/page-127-figure-0083.png)

![Figure from PDF page 127](images/page-127-figure-0084.png)

![Figure from PDF page 127](images/page-127-figure-0085.png)

Circle
![Figure from PDF page 127](images/page-127-figure-0086.png)

Rectangle
![Figure from PDF page 127](images/page-127-figure-0087.png)

![Figure from PDF page 127](images/page-127-figure-0088.png)

![Figure from PDF page 127](images/page-127-figure-0089.png)

![Figure from PDF page 127](images/page-127-figure-0090.png)

![Figure from PDF page 127](images/page-127-figure-0091.png)

MondrianDrawing
SeuratDrawing
+rectangles: List<Rectangle>
+circles: List<Circle>
Figure 3.4
Interfaces for shapes and drawings, and two implementations of each
9 If these names mean nothing to you, check out the artists’ Wikipedia entries (http://en.wikipedia.org/wiki/
Piet_Mondrian and http://en.wikipedia.org/wiki/Georges-Pierre_Seurat). They have special meanings to
me for different reasons: Mondrian is also the name of a code review tool we used at Google, and Seurat is
the eponymous George of Sunday in the Park with George—a wonderful musical by Stephen Sondheim.


<!-- PDF page 128 -->

Limitations of generics in C# and other languages
There are a few options here:
Change the field type to List<IShape> and just live with the casts. This isn’t
pleasant, and it pretty much defeats the point of using generics.
Use the new features provided by C# 2 for implementing iterators, as you’ll see
in chapter 6. This is a reasonable solution for this particular case, but only this
case (where you’re dealing with IEnumerable<T>).
Make each Shapes property implementation create a new copy of the list, possi-
bly using List<T>.ConvertAll for simplicity. Creating an independent copy of
a collection is often the right thing to do in an API anyway, but it causes a lot of
copying, which can be unnecessarily inefficient in many cases.
Make IDrawing generic, indicating the type of shapes in the drawing. Thus,
MondrianDrawing would implement IDrawing<Rectangle>, and SeuratDrawing
would implement IDrawing<Circle>. This is only viable when you own the
interface.
Create a helper class to adapt one kind of IEnumerable<T> into another:
class EnumerableWrapper<TOriginal, TWrapper> : IEnumerable<TWrapper>
where TOriginal : TWrapper
Again, as this particular situation (IEnumerable<T>) is special, you could get
away with just a utility method. In fact, .NET 3.5 ships with two useful methods
like this: Enumerable.Cast<T> and Enumerable.OfType<T>. They’re part of
LINQ, and we’ll look at them in chapter 11. Although this is a special case, it’s
probably the most common form of generic covariance you’ll come across.
When you run into covariance issues, you may need to consider all of these options
and anything else you can think of. It depends heavily on the exact nature of the situ-
ation. Unfortunately, covariance isn’t the only problem you have to deal with. There’s
also the matter of contravariance, which is like covariance in reverse.
WHERE CONTRAVARIANCE WOULD BE USEFUL
Contravariance feels slightly less intuitive than covariance, but it does make sense.
With covariance, you were trying to convert from SomeType<Circle> to SomeType
<IShape> (using IEnumerable<T> for SomeType in the previous example). Contravari-
ance is about converting the other way—from SomeType<IShape> to SomeType
<Circle>. How can that be safe? Well, covariance is safe when SomeType only describes
operations that return the type parameter—and contravariance is safe when SomeType
only describes operations that accept the type parameter.10
The simplest example of a type that only uses its type parameter in an input posi-
tion is IComparer<T>, which is commonly used to sort collections. Let’s expand the
IShape interface (which has been empty so far) to include an Area property. It’s now
easy to write an implementation of IComparer<IShape> that compares any two shapes
by area. You’d then like to be able to write the following code:
10 You’ll see in chapter 13 that there’s slightly more to it than that, but that’s the general principle.


<!-- PDF page 129 -->

Parameterized typing with generics
IComparer<IShape> areaComparer = new AreaComparer();
List<Circle> circles = new List<Circle>();
circles.Add(new Circle(Point.Empty, 20));
circles.Add(new Circle(Point.Empty, 10));
circles.Sort(areaComparer);
![Figure from PDF page 129](images/page-129-figure-0092.png)

![Figure from PDF page 129](images/page-129-figure-0093.png)

![Figure from PDF page 129](images/page-129-figure-0094.png)

INVALID
That won’t work, though, because the Sort method on List<Circle> effectively takes
an IComparer<Circle>. The fact that AreaComparer can compare any shape rather
than just circles doesn’t impress the compiler at all. It considers IComparer <Circle>
and IComparer<IShape> to be completely different types. Maddening, isn’t it? It
would be nice if the Sort method had this signature instead:
void Sort<S>(IComparer<S> comparer) where T : S
Unfortunately, not only is that not the signature of Sort, but it can’t be—the constraint
is invalid, because it’s a constraint on T instead of S. You want a conversion type con-
straint but in the other direction, constraining the S to be somewhere up the inheri-
tance tree of T instead of down.
Given that this isn’t possible, what can you do? There are fewer options this time.
First, you could revisit the idea of creating a generic helper class, as follows.
Listing 3.14
Working around the lack of contravariance with a helper
class ComparisonHelper<TBase, TDerived> : IComparer<TDerived>
where TDerived : TBase
{
private readonly IComparer<TBase> comparer;
Constrains
type
parameter
appropriately B
Uses implicit
conversions to
call comparer
C
public ComparisonHelper(IComparer<TBase> comparer)
{
this.comparer = comparer;
}
public int Compare(TDerived x, TDerived y)
{
return comparer.Compare(x, y);
}
}
Uses implicit conversions
to call comparer
D
This is an example of the adapter pattern at work, although instead of adapting one
interface to a completely different one, you’re just adapting from IComparer<TBase>
to IComparer<TDerived>. You just remember the original comparer providing the
real logic to compare items of the base type C and then call it when you’re asked to
compare items of the derived type D. The fact that no casts are involved (not even
hidden ones) should give you some confidence: this helper is completely type-safe.
You’re able to call the base comparer due to an implicit conversion being available
from TDerived to TBase, which you required with a type constraint B.
The second option is to make the area-comparison class generic with a conversion
type constraint, so it can compare any two values of the same type, as long as that type
implements IShape. For the sake of simplicity in the situation where you really don’t


<!-- PDF page 130 -->

Limitations of generics in C# and other languages
need this functionality, you could keep the nongeneric class by just making it derive
from the generic one:
class AreaComparer<T> : IComparer<T> where T : IShape
class AreaComparer : AreaComparer<IShape>
Of course, you can only do this when you’re able to change the comparison class. This
can be an effective solution, but it still feels unnatural—why should you have to con-
struct the comparer in various ways for different types when it’s not going to behave
any differently? Why should you have to derive from the class to simplify things when
you’re not actually specializing the behavior?
Note that the various options for both covariance and contravariance use more
generics and constraints to express the interface in a more general manner, or to pro-
vide generic helper classes. I know that adding a constraint makes it sound less gen-
eral, but the generality is added by first making the type or method generic. When you
run into a problem like this, adding a level of genericity somewhere with an appropri-
ate constraint should be the first option to consider. Generic methods (rather than
generic types) are often helpful here, as type inference can make the lack of variance
invisible to the naked eye. This is particularly true in C# 3, which has stronger type
inference capabilities than C# 2.
This limitation is a very common cause of questions on C# discussion sites. The
remaining issues are either relatively academic or affect only a moderate subset of the
development community. The next one mostly affects those who do a lot of calcula-
tions (usually scientific or financial) in their work.
3.5.2
Lack of operator constraints or a “numeric” constraint
C# isn’t without its downsides when it comes to heavily mathematical code. The need
to explicitly use the Math class for every operation beyond the simplest arithmetic and
the lack of C-style typedefs to allow the data representation used throughout a pro-
gram to be easily changed have always been raised by the scientific community as bar-
riers to C#’s adoption. Generics weren’t likely to fully solve either of those issues, but
there’s a common problem that stops generics from helping as much as they could
have.
Consider this (illegal) generic method:
public T FindMean<T>(IEnumerable<T> data)
{
T sum = default(T);
int count = 0;
foreach (T datum in data)
{
sum += datum;
count++;
}
return sum / count;
}
![Figure from PDF page 130](images/page-130-figure-0095.png)

![Figure from PDF page 130](images/page-130-figure-0096.png)

![Figure from PDF page 130](images/page-130-figure-0097.png)

INVALID


<!-- PDF page 131 -->

Parameterized typing with generics
Obviously that could never work for all types of data—what could it mean to add one
Exception to another, for instance? Clearly a constraint of some kind is called for…
something that can express what you need to be able to do: add two instances of T
together, and divide a T by an integer. If that were available, even if it were limited to
built-in types, you could write generic algorithms that wouldn’t care whether they
were working on an int, a long, a double, a decimal, and so forth.
Limiting it to the built-in types would’ve been disappointing, but better than noth-
ing. The ideal solution would have to also allow user-defined types to act in a numeric
capacity, so you could define a Complex type to handle complex numbers, for
instance.11 That complex number could then store each of its components in a generic
way as well, so you could have a Complex<float>, a Complex<double>, and so on.
Two related (but hypothetical) solutions present themselves. One would be to
allow constraints on operators, so you could write a set of constraints such as these
(currently invalid) ones:
where T : T operator+ (T, T), T operator/ (T, int)
This would require that T have the operations you need in the earlier code. The other
solution would be to define a few operators and perhaps conversions that must be sup-
ported in order for a type to meet the extra constraint—you could make it the
“numeric constraint” written where T : numeric.
One problem with both of these options is that they can’t be expressed as normal
interfaces, because operator overloading is performed with static members, which
can’t be used to implement interfaces. I find the idea of static interfaces appealing:
interfaces that only declare static members, including methods, operators, and con-
structors. Such static interfaces would only be useful within type constraints, but
they’d present a type-safe generic way of accessing static members. This is just blue sky
thinking, though (see my blog post on the topic for more details: http://mng.bz/
3Rk3). I don’t know of any plans to include this in a future version of C#.
The two neatest workarounds for this problem to date require later versions of
.NET: one designed by Marc Gravell (http://mng.bz/9m8i) uses expression trees
(which you’ll meet in chapter 9) to build dynamic methods; the other uses the
dynamic features of C# 4. You’ll see an example of the latter in chapter 14. But, as you
can tell by the descriptions, both of these are dynamic—you have to wait until execu-
tion time to see whether your code will work with a particular type. There are a few
workarounds that still use static typing, but they have other disadvantages (surpris-
ingly enough, they can sometimes be slower than the dynamic code).
The two limitations we’ve looked at so far have been quite practical—they’ve been
issues you may well run into during actual development. But if you’re generally curi-
ous like I am, you may also be asking yourself about other limitations that don’t neces-
sarily slow down development but are intellectual curiosities. In particular, why are
generics limited to types and methods?
11 This is assuming you’re not using .NET 4 or higher, of course, because then you could use System
.Numerics.Complex.


<!-- PDF page 132 -->

Limitations of generics in C# and other languages
3.5.3
Lack of generic properties, indexers, and other member types
We’ve looked at generic types (classes, structs, delegates, and interfaces) and generic
methods. There are plenty of other members that could be parameterized, but there
are no generic properties, indexers, operators, constructors, finalizers, or events.
First, let’s be precise about what we mean here: clearly an indexer can have a
return type that’s a type parameter—List<T> is an obvious example. KeyValue-
Pair<TKey,TValue> provides similar examples for properties. What you can’t have is
an indexer or property (or any of the other members in that list) with extra type
parameters.
Leaving the possible syntax of declaration aside for the minute, let’s look at how
these members might have to be called:
SomeClass<string> instance = new SomeClass<string><Guid>("x");
int x = instance.SomeProperty<int>;
byte y = instance.SomeIndexer<byte>["key"];
instance.Click<byte> += ByteHandler;
instance = instance +<int> instance;
![Figure from PDF page 132](images/page-132-figure-0098.png)

![Figure from PDF page 132](images/page-132-figure-0099.png)

![Figure from PDF page 132](images/page-132-figure-0100.png)

INVALID
I hope you’ll agree that all of those look somewhat silly. Finalizers can’t even be called
explicitly from C# code, which is why there isn’t a line for them. The fact that you
can’t do any of these isn’t going to cause significant problems anywhere, as far as I can
see—it’s just worth being aware of this as an academic limitation.
The member where this restriction is most irritating is probably the constructor. A
static generic method in the class is a good workaround for this, though, and the sam-
ple generic constructor syntax shown previously with two lists of type arguments is
horrific.
These are by no means the only limitations of C# generics, but I believe they’re the
ones that you’re most likely to run up against, either in your daily work, in community
conversations, or when idly considering the feature as a whole. In the next two sec-
tions, we’ll look at how some aspects of these aren’t issues in the two other languages
whose features are most commonly compared with C#’s generics: C++ (with tem-
plates) and Java (with generics, as of Java 5). We’ll tackle C++ first.
3.5.4
Comparison with C++ templates
C++ templates are a bit like macros taken to an extreme level. They’re incredibly pow-
erful, but there are costs associated with them both in terms of code bloat and ease of
understanding.
When a template is used in C++, the code is compiled for that particular set of tem-
plate arguments, as if the template arguments were in the source code. This means
that there’s not as much need for constraints, because the compiler will check what
you’re allowed to do with the type while it’s compiling the code for this particular set
of template arguments. The C++ standards committee has recognized that constraints
are still useful, though. Constraints were included and then removed from C++11 (the
latest version of C++) but they may yet see the light of day, under the name of concepts.


<!-- PDF page 133 -->

Parameterized typing with generics
The C++ compiler is smart enough to compile the code only once for any given set
of template arguments, but it isn’t able to share code in the way that the CLR does with
reference types. That lack of sharing does have its benefits, though—it allows type-
specific optimizations, such as inlining method calls for some type parameters but not
others, from the same template. It also means that overload resolution can be per-
formed separately for each set of type parameters, rather than just once based solely
on the limited knowledge the C# compiler has due to any constraints present.
Don’t forget that with normal C++ there’s only one compilation involved, rather
than the “compile to IL” and then “JIT compile to native code” model of .NET. A
program using a standard template in 10 different ways will include the code 10 times
in a C++ program. A similar program in C# using a generic type from the framework
in 10 different ways won’t include the code for the generic type at all—it’ll refer to it,
and the JIT will compile as many different versions as required (as described in
section 3.4.2) at execution time.
One significant feature that C++ templates have over C# generics is that the tem-
plate arguments don’t have to be type names. Variable names, function names, and
constant expressions can be used as well. A common example of this is a buffer type
that has the size of the buffer as one of the template arguments—a buffer <int,20>
will always be a buffer of 20 integers, and a buffer<double,35> will always be a buffer
of 35 doubles. This ability is crucial to template metaprogramming (see the Wikipedia
article, http://en.wikipedia.org/wiki/Template_metaprogramming), which is an
advanced C++ technique, the very idea of which scares me but that can be powerful in
the hands of experts.
C++ templates are more flexible in other ways too. They don’t suffer from the lack
of operator constraints described in section 3.5.2, and there are a few other restrictions
that don’t exist in C++: you can derive a class from one of its type parameters, and you
can specialize a template for a particular set of type arguments. The latter ability allows
the template author to write general code to be used when there’s no more knowledge
available, and specific (often highly optimized) code for particular types.
The same variance issues of .NET generics exist in C++ templates as well. An exam-
ple given by Bjarne Stroustrup (the inventor of C++) is that there are no implicit con-
versions between vector<shape*> and vector<circle*> with similar reasoning—in
this case, it might allow you to put a square peg in a round hole.
For further details on C++ templates, I recommend Stroustrup’s The C++ Program-
ming Language, 3rd edition (Addison-Wesley Professional, 1997). It’s not always the
easiest book to follow, but the templates chapter is fairly clear (once you get your
mind around C++ terminology and syntax). For more comparisons with .NET gener-
ics, look at the blog post by the Visual C++ team on this topic (http://mng.bz/En13).
The other obvious language to compare with C# in terms of generics is Java, which
introduced the feature into the mainstream language for the 1.5 release12 several
years after other projects had created Java-like languages that supported generics.
12 Or 5.0, depending on which numbering system you use. Don’t get me started.


<!-- PDF page 134 -->

Limitations of generics in C# and other languages
3.5.5
Comparison with Java generics
Where C++ includes more of the template in the generated code than C# does, Java
includes less. In fact, the Java runtime doesn’t know about generics at all. The Java byte-
code (roughly equivalent to IL) for a generic type includes some extra metadata to say
that it’s generic, but after compilation the calling code doesn’t have much to indicate
that generics were involved at all, and an instance of a generic type only knows about
the nongeneric side of itself. For example, an instance of HashSet<E> doesn’t know
whether it was created as a HashSet<String> or a HashSet<Object>. The compiler
effectively adds casts where necessary and performs more sanity checking.
Here’s an example—first the generic Java code:
ArrayList<String> strings = new ArrayList<String>();
strings.add("hello");
String entry = strings.get(0);
strings.add(new Object());
And here’s the equivalent nongeneric code:
ArrayList strings = new ArrayList();
strings.add("hello");
String entry = (String) strings.get(0);
strings.add(new Object());
They would generate the same Java bytecode, except for the last line, which is valid in
the nongeneric case but will be caught by the compiler as an error in the generic
version. You can use a generic type as a raw type, which is similar to using
java.lang.Object for each of the type arguments. This rewriting—and loss of infor-
mation—is called type erasure. Java doesn’t have user-defined value types, but you can’t
even use the built-in ones as type arguments. Instead, you have to use the boxed ver-
sions—ArrayList<Integer> for a list of integers, for example.
You’ll be forgiven for thinking this is all a bit disappointing compared with gener-
ics in C#, but there are some nice features of Java generics too:
The virtual machine doesn’t know anything about generics, so you can use code
compiled using generics on an older version, as long as you don’t use any
classes or methods that aren’t present on the old version. Versioning in .NET is
much stricter in general—for each assembly you reference, you can specify
whether the version number has to match exactly. In addition, code built to run
on the 2.0 CLR won’t run on .NET 1.1.
You don’t need to learn a new set of classes to use Java generics—where a non-
generic developer would use ArrayList, a generic developer just uses Array-
List<E>. Existing classes can be upgraded to generic versions reasonably easily.
The previous feature has been utilized quite effectively with the reflection sys-
tem—java.lang.Class (the equivalent of System.Type) is generic, which
allows compile-time type safety to be extended to cover many situations involv-
ing reflection. In some other situations it’s a pain, though.


<!-- PDF page 135 -->

Parameterized typing with generics
Java has support for generic variance using wildcards. For instance, ArrayList
<? extends Base> can be read as “this is an ArrayList of some type that derives
from Base, but we don’t know which exact type.” When we discuss C# 4’s support
for generic variance in chapter 13, we’ll revisit this with a short example.
My personal opinion is that .NET generics are superior in almost every respect,
although when I run into covariance/contravariance issues, I often wish I had wild-
cards. C# 4’s limited generic variance improves this somewhat, but there are still times
when the variance Java model works better. Java with generics is still much better than
Java without generics, but there are no performance benefits and the safety only
applies at compile time.
3.6
Summary
Phew! It’s a good thing generics are simpler to use in reality than they are to describe.
Although they can get complicated, they’re widely regarded as the most important
addition to C# 2 and they’re incredibly useful. The worst thing about writing code
using generics is that if you ever have to go back to C# 1, you’ll miss them terribly.
(Fortunately that’s becoming increasingly unlikely, of course.)
In this chapter, I haven’t tried to cover every detail of what is and isn’t allowed
when using generics—that’s the job of the language specification, and it makes for dry
reading. Instead, I’ve aimed for a practical approach, providing the information you’ll
need in everyday use, with a smattering of theory for the sake of academic interest.
We’ve looked at the three main benefits of generics: compile-time type safety, per-
formance, and code expressiveness. Being able to get the IDE and compiler to validate
your code early is certainly a good thing, but it’s arguable that more is to be gained
from tools providing intelligent options based on the types involved than from the
actual safety aspect.
Performance is improved most radically when it comes to value types, which no
longer need to be boxed and unboxed when they’re used in strongly typed generic
APIs, particularly the generic collection types provided in .NET 2.0. Performance with
reference types is usually improved but only slightly.
Your code is able to express its intention more clearly using generics—instead of a
comment or a long variable name being required to describe exactly what types are
involved, the details of the type itself can do the work. Comments and variable names
can often become inaccurate over time, as they can be forgotten when the code is
changed, but the type information is correct by definition.
Generics aren’t capable of doing everything you might sometimes like them to do,
and I’ve covered some of their limitations in the chapter, but if you truly embrace
C# 2 and the generic types within the .NET 2.0 Framework, you’ll come across good
uses for them incredibly frequently in your code.
This topic will come up time and time again in future chapters, as other new fea-
tures build on this key one. Indeed, the subject of the next chapter would be very dif-
ferent without generics—we’ll look at nullable types, as implemented by Nullable<T>.
