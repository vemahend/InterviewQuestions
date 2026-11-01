# Chapter 10: Extension methods

> Source: C# in Depth, Third Edition — Jon Skeet. Original PDF pages 293–315.

[← Table of contents](../README.md)


<!-- PDF page 293 -->

## Extension methods

This chapter covers
Writing extension methods
Calling extension methods
Method chaining
Extension methods in .NET 3.5
Other uses for extension methods
I’m not a fan of inheritance. Or rather, I’m not a fan of a number of places where
inheritance has been used in code that I’ve maintained, or class libraries I’ve worked
with. As with so many things, it’s powerful when used properly, but its design over-
head is often overlooked and can become painful over time. It’s sometimes used as
a way of adding extra behavior and functionality to a class, even when no real infor-
mation about the object is being added—where nothing is being specialized.
Sometimes that’s appropriate—if objects of the new type should carry around
the details of the extra behavior—but often it’s not. Often it’s just not possible to
use inheritance in this way in the first place, such as when you’re working with a
value type, a sealed class, or an interface. The alternative is usually to write a bunch
of static methods, most of which take an instance of the type in question as at least


<!-- PDF page 294 -->

Life before extension methods
one of their parameters. This works fine, without the design penalty of inheritance,
but it tends to make code look ugly.
C# 3 introduced the idea of extension methods, which have the benefits of the static
methods solution and also improve the readability of code that calls them. They let
you call static methods as if they were instance methods of a completely different class.
Don’t panic—it’s not as crazy or as arbitrary as it sounds.
In this chapter we’ll first look at how to use extension methods and how to write
them. We’ll then examine a few of the extension methods provided by .NET 3.5 and
see how they can be chained together easily. This chaining ability is an important part
of the reason for introducing extension methods to the language in the first place,
and it’s an important part of LINQ.1 Finally, we’ll consider some of the pros and cons
of using extension methods instead of plain static methods.
First, though, let’s take a closer look at why extension methods are sometimes
desirable compared with what’s available in C# 1 and 2, particularly when you create
utility classes.
10.1
Life before extension methods
You may be getting a sense of déjà vu at this point, because utility classes came up in
C# 3, you should look at your static classes—many of the methods in them may be
good candidates for converting into extension methods. That’s not to say that all exist-
ing static classes are a good fit, but you may well recognize the following traits:
You want to add some members to a type.
You don’t need to add any more data to the instances of the type.
You can’t change the type itself, because it’s in someone else’s code.
One slight variation on this is where you want to work with an interface instead of a
class, adding useful behavior while only calling methods on the interface. A good
example of this is IList<T>. Wouldn’t it be nice to be able to sort any (mutable)
implementation of IList<T>? It’d be horrendous to force each implementation of the
interface to implement sorting, but it’d be nice from the point of view of the user of
the list.
The thing is, IList<T> provides all the building blocks for a completely generic
sort routine (several, in fact), but you can’t put that implementation in the interface.
IList<T> could’ve been specified as an abstract class instead, and the sorting func-
tionality included that way, but as C# and .NET have single inheritance of implementa-
tion, that would’ve placed a significant restriction on the types deriving from it. An
extension method on IList<T> would allow you to sort any IList<T> implementa-
tion, making it appear as if the list itself provided the functionality.
1 If you’re getting fed up with hearing about how many features are “an important part of LINQ,” I don’t blame
you, but that’s part of its greatness. There are lots of small parts, but the sum of them is very shiny. The fact
that each feature can be used independently is an added bonus.


<!-- PDF page 295 -->

Extension methods
You’ll see later that a lot of the functionality of LINQ is built on extension methods
over interfaces. For the moment, though, we’ll use a different type for our examples:
System.IO.Stream, the bedrock of binary communication in .NET. Stream itself is an
abstract class with several concrete derived classes, such as NetworkStream,
FileStream, and MemoryStream. Unfortunately, there are a few pieces of functionality
that would’ve been handy to include in Stream that just aren’t there.
The missing features I’m most often aware of are the ability to read the whole of a
stream into memory as a byte array, and the ability to copy the contents of one stream
into another.2 Both of these features are frequently implemented badly, making
assumptions about streams that just aren’t valid—the most common misconception
being that Stream.Read will completely fill the buffer if the data doesn’t run out first.
NOT SO “MISSING” AFTER ALL
One of these features has been added to .NET 4:
Stream now has a CopyTo method. This is useful in terms of demonstrating
one slightly brittle aspect of extension methods, and we’ll come back to it in
section 10.2.3. ReadFully is still missing, but it should be used carefully any-
way: you should only try to read the entirety of a stream if you’re confident it
actually has an end and that all the data fits into memory. Streams are under
no obligation to have a finite amount of data.
It’d be nice to have the functionality in a single place, rather than duplicating it in sev-
eral projects. That’s why I wrote the StreamUtil class in my miscellaneous utility
library. The real code contains a fair amount of error checking and other functional-
ity, but the following listing shows a cut-down version that’s more than adequate for
our needs.
Listing 10.1
A simple utility class to provide extra functionality for streams
using System.IO;
public static class StreamUtil
{
const int BufferSize = 8192;
public static void Copy(Stream input, Stream output)
{
byte[] buffer = new byte[BufferSize];
int read;
while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
{
output.Write(buffer, 0, read);
}
}
public static byte[] ReadFully(Stream input)
{
using (MemoryStream tempStream = new MemoryStream())
2 Due to the nature of streams, this copying doesn’t necessarily duplicate the data—it just reads it from one
stream and writes it to another. Although copy isn’t a strictly accurate term in this sense, the difference is usu-
ally irrelevant.


<!-- PDF page 296 -->

Extension method syntax
{
Copy(input, tempStream);
return tempStream.ToArray();
}
}
}
The implementation details don’t matter much, although it’s worth noting that the
ReadFully method calls the Copy method—that’ll be useful to demonstrate a point
about extension methods later.
The class is easy to use—the following listing shows how you can write a web
response to disk, for example.
Listing 10.2
Using StreamUtil to copy a web response stream to a file
WebRequest request = WebRequest.Create("http://manning.com");
using (WebResponse response = request.GetResponse())
using (Stream responseStream = response.GetResponseStream())
using (FileStream output = File.Create("response.dat"))
{
StreamUtil.Copy(responseStream, output);
}
Listing 10.2 is quite compact, and the StreamUtil class has taken care of looping and
asking the response stream for more data until it’s all been received. It’s done its job
as a utility class perfectly reasonably. Even so, it doesn’t feel very object-oriented. It’d
be better to ask the response stream to copy itself to the output stream, just like the
MemoryStream class has a WriteTo method. It’s not a big problem, but it’s a little ugly
as it is.
Inheritance wouldn’t help you in this situation (you want this behavior to be avail-
able for all streams, not just ones you’re responsible for), and you can’t go changing
the Stream class itself, so what can you do? With C# 2, you were out of options—you
had to stick with the static methods and live with the clumsiness. C# 3 allows you to
change your static class to expose its members as extension methods, so you can pre-
tend that the methods have been part of Stream all along. Let’s see what changes are
required.
10.2
Extension method syntax
Extension methods are almost embarrassingly easy to create, and they’re simple to
use, too. The considerations around when and how to use them are significantly
deeper than the difficulties involved in learning how to write them in the first place.
Let’s start by converting the StreamUtil class so it has a couple of extension methods.
10.2.1 Declaring extension methods
You can’t use just any method as an extension method—it must have the following
characteristics:


<!-- PDF page 297 -->

Extension methods
It must be in a non-nested, nongeneric static class (and therefore must be a
static method).
It must have at least one parameter.
The first parameter must be prefixed with the this keyword.
The first parameter can’t have any other modifiers (such as out or ref).
The type of the first parameter must not be a pointer type.
That’s it—the method can be generic, return a value, have ref/out parameters other
than the first one, be implemented with an iterator block, be part of a partial class, use
nullable types—anything, as long as the preceding constraints are met.
We’ll call the type of the first parameter the extended type of the method and say that
the method extends that type—in this case, we’re extending Stream. This isn’t official
terminology from the specification, but it’s a useful piece of shorthand.
Not only does the previous list provide all the restrictions, but it also gives the
details of what you need to do to turn a normal static method in a static class into an
extension method—just add the this keyword. The following listing shows the same
class as in listing 10.1, but this time with both methods as extension methods.
Listing 10.3
The StreamUtil class again, but this time with extension methods
public static class StreamUtil
{
const int BufferSize = 8192;
public static void CopyTo(this Stream input, Stream output)
{
byte[] buffer = new byte[BufferSize];
int read;
while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
{
output.Write(buffer, 0, read);
}
}
public static byte[] ReadFully(this Stream input)
{
using (MemoryStream tempStream = new MemoryStream())
{
CopyTo(input, tempStream);
return tempStream.ToArray();
}
}
}
Yes, the only big change in listing 10.3 is the addition of the two modifiers shown in
bold. I’ve also changed the name of the method from Copy to CopyTo. As you’ll see in
a minute, that’ll allow calling code to read more naturally, although it does look
slightly strange in the ReadFully method at the moment.
Now, it’s not much use having extension methods if you can’t use them…


<!-- PDF page 298 -->

Extension method syntax
10.2.2 Calling extension methods
I’ve mentioned it in passing, but you haven’t yet seen what an extension method actu-
ally does. Simply put, it pretends to be an instance method of another type—the type
of the first parameter of the method.
The transformation of code that uses StreamUtil is as simple as the transforma-
tion of the utility class itself. This time, instead of adding something in, we’ll take it
away. The following listing is a repeat performance of listing 10.2, but using the new
syntax to call CopyTo. I say “new,” but it’s really not new at all—it’s the same syntax
you’ve always used for calling instance methods.
Listing 10.4
Copying a stream using an extension method
WebRequest request = WebRequest.Create("http://manning.com");
using (WebResponse response = request.GetResponse())
using (Stream responseStream = response.GetResponseStream())
using (FileStream output = File.Create("response.dat"))
{
responseStream.CopyTo(output);
}
In listing 10.4 it at least looks like you’re asking the response stream to do the copying.
It’s still StreamUtil doing the work behind the scenes, but the code reads in a more
natural way. In fact, the compiler has converted the CopyTo call into a normal static
method call to StreamUtil.CopyTo, passing the value of responseStream as the first
argument (followed by output as normal).
Now that you can see the code in question, I hope you understand why I changed
the method name from Copy to CopyTo. Some names work just as well for static meth-
ods as instance methods, but you’ll find that others need tweaking to get the maxi-
mum readability benefit.
If you want to make the StreamUtil code slightly more pleasant, you can change
the line of ReadFully that calls CopyTo like this:
input.CopyTo(tempStream);
At this point, the name change is fully appropriate for all the uses—although there’s
nothing to stop you from using the extension method as a normal static method,
which is useful when you’re migrating a lot of code.
You may have noticed that nothing in these method calls indicates that you’re
using an extension method instead of a regular instance method of Stream. This can
be seen in two ways: it’s a good thing if your aim is to make extension methods blend
in as much as possible and cause little alarm, but it’s a bad thing if you want to be able
to immediately see what’s really going on.
If you’re using Visual Studio, you can hover over a method call and get an indica-
tion in the tooltip when it’s an extension method, as shown in figure 10.1. IntelliSense
also indicates when it’s offering an extension method, in both the icon for the
method and the tooltip when it’s selected. Of course, you don’t want to have to hover


<!-- PDF page 299 -->

Extension methods
![Figure from PDF page 299](images/page-299-figure-0259.png)

![Figure from PDF page 299](images/page-299-figure-0260.png)

WebRequest request = WebRequest.Create("http://manning.com");
using (WebResponse response = request.GetResponse())
using (Stream responseStream = response.GetResponseStream()0
using (FileStream output = File.Create("response.dat"))
{
responseStream.CopyTo(output);
}
py
(
p
);
![Figure from PDF page 299](images/page-299-figure-0261.png)

![Figure from PDF page 299](images/page-299-figure-0262.png)

(extension) void Stream.CopyTo(Stream output)
Figure 10.1
Hovering over a method call in Visual Studio reveals whether the
method is an extension method.
over every method call you make or be super careful with IntelliSense, but most of the
time it doesn’t matter whether you’re calling an instance or extension method.
There’s still one rather strange thing about this calling code—it doesn’t mention
StreamUtil anywhere! How does the compiler know to use the extension method in
the first place?
10.2.3 Extension method discovery
It’s important to know how to call extension methods, but it’s also important to know
how to not call them—how to avoid being presented with unwanted options. To
achieve that, you need to know how the compiler decides which extension methods to
use in the first place.
Extension methods are made available to the code in the same way that classes are
made available without qualification—with using directives. When the compiler sees
an expression that looks like it’s trying to use an instance method, but none of the
instance methods are compatible with the method call (if there’s no method with that
name, for instance, or no overload matches the arguments given), it then looks for an
appropriate extension method. It considers all the extension methods in all the
imported namespaces and the current namespaces, and matches ones where there’s
an implicit conversion from the expression type to the extended type.
Implementation detail: how does the compiler spot an extension method?
To work out whether it should use an extension method, the compiler has to be able
to tell the difference between an extension method and other methods within a
static class that happen to have an appropriate signature. It does this by checking
whether System.Runtime.CompilerServices.ExtensionAttribute has been
applied to the method and the class. This attribute was introduced in .NET 3.5, but
the compiler doesn’t check which assembly the attribute comes from. This means
that you can still use extension methods even if your project targets .NET 2.0—you
just need to define your own attribute with the right name in the right namespace.
You can then declare your extension methods as normal, and the attribute will be
applied automatically. The compiler also applies the attribute to the assembly con-
taining the extension method, but it doesn’t currently require this when searching for
extension methods.


<!-- PDF page 300 -->

Extension method syntax
Introducing your own copies of system types can become problematic when you later
need to use a version of the framework that already defines those types. If you do
use this technique, it’s worth using preprocessor symbols to only declare the attri-
bute conditionally. You can then build one version of your code targeting .NET 2.0 and
another targeting .NET 3.5 and higher.
If multiple applicable extension methods are available for different extended types
(using implicit conversions), the most appropriate one is chosen with the better con-
version rules used in overloading. For instance, if IDerived inherits from IBase, and
there’s an extension method with the same name for both, then the IDerived exten-
sion method is used in preference to the one on IBase. Again, this feature is used in
LINQ, as you’ll see in section 12.2, where you’ll meet the IQueryable<T> interface.
It’s important to note that if an applicable instance method is available, that will
always be used before searching for extension methods, but the compiler doesn’t issue
a warning if an extension method also matches an existing instance method. For
example, .NET 4 has a new Stream method that’s also called CopyTo. It has two over-
loads, one of which conflicts with the extension method you just created. The result is
that the new method is picked in preference to the extension method, so if you com-
pile listing 10.4 against .NET 4, you’ll end up using Stream.CopyTo instead of Stream-
Util.CopyTo. You can still call the StreamUtil method statically using the normal
syntax of StreamUtil.CopyTo(input, output), but it’ll never be picked as an exten-
sion method. In this case, there’s no harm to existing code: the new instance method
has the same meaning as your extension method, so it doesn’t matter which one is
used. In other cases, there could be subtle differences in semantics that might be hard
to spot until the code breaks.
Another potential problem with the way that extension methods are made avail-
able to code is that it’s very wide-ranging. If there are two classes in the same
namespace containing methods with the same extended type, there’s no way of only
using the extension methods from one of the classes. Likewise, there’s no way of
importing a namespace for the sake of making types available using only their simple
names, but without making the extension methods within that namespace available at
the same time. You may want to use a namespace that solely contains static classes with
extension methods to mitigate this problem, unless the rest of the functionality of the
namespace is heavily dependent on the extension methods already (as is the case for
System.Linq, for example).
One aspect of extension methods can be quite surprising when you first encounter
it, but it’s also useful in some situations. It’s all about null references—let’s take a look.
10.2.4 Calling a method on a null reference
Anyone who does a significant amount of .NET programming is bound to encounter a
NullReferenceException caused by calling a method via a variable whose value turns


<!-- PDF page 301 -->

Extension methods
out to be a null reference. You can’t call instance methods on null references in C#
(although IL itself supports it for nonvirtual calls), but you can call extension methods
with a null reference. This is demonstrated by the following listing. Note that this isn’t
a snippet, since nested classes can’t contain extension methods.
Listing 10.5
Extension method being called on a null reference
using System;
public static class NullUtil
{
public static bool IsNull(this object x)
{
return x == null;
}
}
public class Test
{
static void Main()
{
object y = null;
Console.WriteLine(y.IsNull());
y = new object();
Console.WriteLine(y.IsNull());
}
}
The output of listing 10.5 is True, and then False. If IsNull had been a normal
instance method, an exception would’ve been thrown in the second line of Main;
instead, IsNull was called with null as the argument. Prior to the advent of extension
methods, C# had no way of letting you write the more readable y.IsNull() form
safely, requiring NullUtil.IsNull(y) instead.
There’s one particularly obvious example in the framework where this aspect of
the behavior of extension methods could be useful: string.IsNullOrEmpty. C# 3
allows you to write an extension method that has the same signature (other than the
extra parameter for the extended type) as an existing static method on the extended
type. To save you reading through that sentence several times, here’s an example—
even though the string class has a static, parameterless method IsNullOrEmpty, you
can still create and use the following extension method:
public static bool IsNullOrEmpty(this string text)
{
return string.IsNullOrEmpty(text);
}
At first it seems odd to be able to call IsNullOrEmpty on a variable that’s null without
an exception being thrown, particularly if you’re familiar with it as a static method
from .NET 2.0. But in my view, code using the extension method is more easily under-
standable. For instance, if you read the expression if (name.IsNullOrEmpty()) out
loud, it says exactly what it’s doing.


<!-- PDF page 302 -->

Extension methods in .NET 3.5
As always, experiment to see what works for you, but be aware of the possibility of
other people using this technique if you’re debugging code. Don’t assume that an
exception will be thrown on a method call unless you’re sure it’s not an extension
method. Also, think carefully before reusing an existing name for an extension
method—the previous extension method could confuse readers who are only familiar
with the static method from the framework.
CHECKING FOR NULLITY
I’m sure that, as a conscientious developer, your pro-
duction methods always check their arguments’ validity before proceeding.
One question that naturally arises from this quirky feature of extension meth-
ods is what exception you should throw when the first argument is null
(assuming it’s not meant to be). Should it be ArgumentNullException, as if it
were a normal argument, or should it be NullReferenceException, which is
what would’ve happened if the extension method had been an instance
method to start with? I recommend the former: it’s still an argument, even if
the extension method syntax doesn’t make that obvious. This is the route that
Microsoft has taken for the extension methods in the framework, so it has the
benefit of consistency too. Finally, bear in mind that extension methods can
still be called as normal static methods, and in that situation, Argument-
NullException is clearly the preferred result.
Now that you know the syntax and behavior of extension methods, we can look at
some examples of the ones provided in .NET 3.5 as part of the framework.
10.3
Extension methods in .NET 3.5
The biggest use of extension methods in the framework is for LINQ. Some LINQ pro-
viders have a few extension methods to help them along, but there are two classes
that stand out, both of them appearing in the System.Linq namespace: Enumerable
and Queryable. These contain many, many extension methods; most of the ones in
Enumerable operate on IEnumerable<T> and most of those in Queryable operate on
IQueryable<T>. We’ll look at the purpose of IQueryable<T> in chapter 12, but for
the moment let’s concentrate on Enumerable.
10.3.1 First steps with Enumerable
Enumerable has a lot of methods in it, and the purpose of this section isn’t to cover all
of them, but to give you enough of a feel for them that you’re comfortable going off
and experimenting. It’s a joy to play with everything available in Enumerable, and it’s
definitely worth firing up Visual Studio or LINQPad for your experiments (rather
than using Snippy), as IntelliSense is handy for this kind of activity. Appendix A gives a
quick rundown of the behavior of all Enumerable’s methods too.
All the complete examples in this section deal with a simple situation: we’ll start
with a collection of integers and transform it in various ways. Real-life situations are
likely to be somewhat more complicated, usually dealing with business-related types,
so at the end of this section I’ll present a couple examples of the transformation side


<!-- PDF page 303 -->

Extension methods
of things applied to possible business situations, with full source code available on the
book’s website. But those examples are harder to play with than a straightforward col-
lection of numbers.
It’s worth considering some recent projects you’ve been working on as you read
this chapter; see if you can think of situations where you could make your code sim-
pler or more readable by using the kind of operations described here.
There are a few methods in Enumerable that aren’t extension methods, and we’ll
use one of them in the examples for the rest of the chapter. The Range method takes
two int parameters: the number to start with and how many results to yield. The
result is an IEnumerable<int> that returns one number at a time in the obvious way.
To demonstrate the Range method and create a framework to play with, let’s print
out the numbers 0 to 9, as shown in the following listing.
Listing 10.6
Using Enumerable.Range to print out the numbers 0 to 9
var collection = Enumerable.Range(0, 10);
foreach (var element in collection)
{
Console.WriteLine(element);
}
No extension methods are called in listing 10.6, just a plain static method. And yes, it
really does just print the numbers 0 to 9—I never claimed this code would set the
world on fire.
DEFERRED EXECUTION
The Range method doesn’t build a list with the appro-
priate numbers—it just yields them at the appropriate time. In other words,
constructing the enumerable instance doesn’t do the bulk of the work; it gets
things ready, so that the data can be provided in a just-in-time fashion at the
appropriate point. This is called deferred execution—you saw this sort of behav-
ior when we looked at iterator blocks in chapter 6, but you’ll see much more
of it in the next chapter.
Pretty much the simplest thing you can do with a sequence of numbers that’s already
in order is to reverse it. The following listing uses the Reverse extension method to do
this—it returns an IEnumerable<T> that yields the same elements as the original
sequence, but in the reverse order.
Listing 10.7
Reversing a collection with the Reverse method
var collection = Enumerable.Range(0, 10)
.Reverse();
foreach (var element in collection)
{
Console.WriteLine(element);
}


<!-- PDF page 304 -->

Extension methods in .NET 3.5
Efficiency: buffering versus streaming
The extension methods provided by the framework stream or pipe data wherever pos-
sible. When an iterator is asked for its next element, it’ll often take an element from
the iterator it’s chained to, process that element, and then return something appro-
priate, preferably without using any more storage itself. Simple transformations and
filters can do this easily, and it’s a powerful way of efficiently processing data where
it’s possible, but some operations, such as reversing the order or sorting, require all
the data to be available, so it’s all loaded into memory for bulk processing. The dif-
ference between this buffered approach and piping is similar to the difference
between reading data by loading a whole DataSet versus using a DataReader to pro-
cess one record at a time. It’s important to consider what’s required when using
LINQ—a single method call can have significant performance implications.
Streaming is also known as lazy evaluation, and buffering is also known as eager
evaluation. For example, the Reverse method uses deferred execution (it does noth-
ing until the first call to MoveNext), but it then eagerly evaluates its data source. Per-
sonally, I dislike the terms lazy and eager, as they mean different things to different
people (a topic I discuss more in my “Just how lazy are you?” blog entry: http://
mng.bz/3LLM).
Predictably enough, this prints out 9, then 8, then 7, and so on right down to 0. You
called Reverse (seemingly) on an IEnumerable<int>, and the same type has been
returned. This pattern of returning one enumerable based on another is pervasive in
the Enumerable class.
Let’s do something more adventurous now—we’ll use a lambda expression to
remove the even numbers.
10.3.2 Filtering with Where and chaining method calls together
The Where extension method is a simple but powerful way of filtering collections. It
accepts a predicate, which it applies to each of the elements of the original collection.
It returns an IEnumerable<T>, and any element that matches the predicate is included
in the resulting collection.
Listing 10.8 demonstrates this, applying the odd/even filter to the collection of
integers before reversing it. You don’t have to use a lambda expression here; for
instance, you could use a delegate you’d created earlier, or an anonymous method. In
this case (and in many other real-life situations), it’s simple to put the filtering logic
inline, and lambda expressions keep the code concise.
Listing 10.8
Using the Where method with a lambda expression to find odd numbers
var collection = Enumerable.Range(0, 10)
.Where(x => x % 2 != 0)
.Reverse();
foreach (var element in collection)
{
Console.WriteLine(element);
}


<!-- PDF page 305 -->

Extension methods
Listing 10.8 prints out the numbers 9, 7, 5, 3, and 1. Hopefully, you’ll have noticed a
pattern forming—you’re chaining the method calls together. The chaining idea itself
isn’t new. For example, StringBuilder.Replace always returns the instance you call it
on, allowing code like this:
builder = builder.Replace("<", "&lt;")
.Replace(">", "&gt;")
...
In contrast, String.Replace returns a string, but a new one each time—this allows
chaining, but in a slightly different way. Both patterns are handy to know about; the
“return the same reference” pattern works well for mutable types, whereas “return a
new instance that’s a copy of the original with some changes” is required for immuta-
ble types.
Chaining with instance methods like String.Replace and StringBuilder
.Replace has always been simple, but extension methods allow static method calls to
be chained together. This is one of the primary reasons why extension methods exist. They’re
useful for other utility classes, but their true power is revealed in this ability to chain
static methods in a natural way. That’s why extension methods primarily show up in
Enumerable and Queryable in .NET: LINQ is geared toward this approach to data pro-
cessing, with information effectively traveling through pipelines constructed of indi-
vidual operations chained together.
EFFICIENCY CONSIDERATION: REORDERING METHOD CALLS TO AVOID WASTE
I’m
not a fan of micro-optimization without good cause, but it’s worth looking at
the ordering of the method calls in listing 10.8. You could’ve added the Where
call after the Reverse call and achieved the same results, but that would’ve
wasted some effort—the Reverse call would’ve had to work out where the
even numbers should come in the sequence even though they’ll be discarded
from the final result. In this case, it won’t make much difference, but it can
have a significant effect on performance in real situations; if you can reduce
the amount of wasted work without compromising readability, that’s a good
thing. That doesn’t mean you should always put filters at the start of the pipe-
line, though; you need to think carefully about any reordering to make sure
you get the correct results.
There are two obvious ways of writing the first part of listing 10.8 without using the
fact that Reverse and Where are extension methods. One is to use a temporary vari-
able, which keeps the structure intact:
var collection = Enumerable.Range(0, 10);
collection
= Enumerable.Where(collection, x => x % 2 != 0)
collection
= Enumerable.Reverse(collection);
I hope you’ll agree that the meaning of the code is far less clear here than in listing 10.8.
It gets even worse with the other option, which is to keep the single-statement style:


<!-- PDF page 306 -->

Extension methods in .NET 3.5
var collection = Enumerable.Reverse
(Enumerable.Where
(Enumerable.Range(0, 10),
x => x % 2 != 0));
The method call order appears to be reversed, because the innermost method call
(Range) will be performed first, then the others, with execution working its way out-
ward. Even with just three method calls it’s ugly—it becomes far worse for queries
involving more operators.
Before we move on, let’s think a bit about what the Where method does.
10.3.3 Interlude: haven’t we seen the Where method before?
If the Where method feels familiar, it’s because you implemented it in chapter 6. All
you need to do is convert listing 6.9 into an extension method and change the dele-
gate type from Predicate<T> to Func<T,bool> and you have a perfectly good alterna-
tive implementation to Enumerable.Where:
public static IEnumerable<T> Where<T>(this IEnumerable<T> source,
Func<T, bool> predicate)
{
if (source == null || predicate == null)
{
throw new ArgumentNullException();
}
return WhereImpl(source, predicate);
}
private static IEnumerable<T> WhereImpl<T>(IEnumerable<T> source,
Func<T, bool> predicate)
{
foreach (T item in source)
{
if (predicate(item))
{
yield return item;
}
}
}
You can change the last part of listing 6.9 to make it look more LINQ-like, too:
foreach (string line in LineReader.ReadLines("../../FakeLinq.cs")
.Where(line => line.StartsWith("using")))
{
Console.WriteLine(line);
}
This is effectively a LINQ query without using the System.Linq namespace. It would
work perfectly well in .NET 2.0 if you declared the appropriate Func delegate and
[ExtensionAttribute]. You could even use that implementation for the where clause
in a query expression (while still targeting .NET 2.0), as you’ll see in the next chap-
ter—but let’s not get ahead of ourselves.


<!-- PDF page 307 -->

Extension methods
Filtering is one of the simplest operations in a query, and another is transforming
or projecting the results.
10.3.4 Projections using the Select method and anonymous types
The most commonly used projection method in Enumerable is Select. It operates on
an IEnumerable<TSource> and projects it into an IEnumerable<TResult> by way of a
Func<TSource,TResult>, which is the transformation to use on each element, speci-
fied as a delegate. It’s much like the ConvertAll method in List<T>, but it operates
on any enumerable collection and uses deferred execution to perform the projection
when each element is requested.
When I introduced anonymous types, I said they were useful with lambda expres-
sions and LINQ—here’s an example of the kind of thing you can do with them. You
currently have the odd numbers from 0 to 9 (in reverse order)—let’s create a type that
encapsulates the square root of the number as well as the original number. The fol-
lowing listing shows both the projection and a slightly modified way of writing out the
results. I’ve adjusted the whitespace solely for the sake of space on the printed page.
Listing 10.9
Projection using a lambda expression and an anonymous type
var collection = Enumerable.Range(0, 10)
.Where(x => x % 2 != 0)
.Reverse()
.Select(x => new { Original = x, SquareRoot = Math.Sqrt(x) } );
foreach (var element in collection)
{
Console.WriteLine("sqrt({0})={1}",
element.Original,
element.SquareRoot);
}
This time the type of collection isn’t IEnumerable<int>—it’s IEnumerable
<Something>, where Something is the anonymous type created by the compiler. You
can’t give the collection variable an explicit type other than the nongeneric
IEnumerable type or object. Implicit typing (with var) is what allows you to use the
Original and SquareRoot properties when writing out the results.
The output of listing 10.9 is as follows:
sqrt(9)=3
sqrt(7)=2.64575131106459
sqrt(5)=2.23606797749979
sqrt(3)=1.73205080756888
sqrt(1)=1
Of course, a Select method doesn’t have to use an anonymous type at all—you
could’ve selected just the square root of the number, discarding the original. In that
case, the result would’ve been IEnumerable<double>. Alternatively, you could’ve man-
ually written a type to encapsulate an integer and its square root—it was just easiest to
use an anonymous type in this case.


<!-- PDF page 308 -->

Extension methods in .NET 3.5
Let’s look at one last method to round off our coverage of Enumerable for the
moment: OrderBy.
10.3.5 Sorting using the OrderBy method
Sorting is a common requirement when processing data, and in LINQ this is usually
performed by using the OrderBy or OrderByDescending methods. The first call is
sometimes followed by ThenBy or ThenByDescending if you need to sort by more than
one property of the data. This ability to sort on multiple properties has always been
available the hard way using a complicated comparison, but it’s much clearer to be
able to present a series of simple comparisons.
To demonstrate this, let’s make a small change to the operations involved. You’ll
start off with the integers –5 to 5 (inclusive, so there are 11 elements in total), and
then project to an anonymous type containing the original number and its square
(rather than square root). Finally, you’ll sort by the square and then the original num-
ber. The following listing shows all of this.
Listing 10.10
Ordering a sequence by two properties
var collection = Enumerable.Range(-5, 11)
.Select(x => new { Original = x, Square = x * x })
.OrderBy(x => x.Square)
.ThenBy(x => x.Original);
foreach (var element in collection)
{
Console.WriteLine(element);
}
Note how aside from the call to Enumerable.Range, the code reads almost exactly like
the textual description. The anonymous type’s ToString implementation does the for-
matting this time, and here are the results:
{ Original = 0, Square = 0 }
{ Original = -1, Square = 1 }
{ Original = 1, Square = 1 }
{ Original = -2, Square = 4 }
{ Original = 2, Square = 4 }
{ Original = -3, Square = 9 }
{ Original = 3, Square = 9 }
{ Original = -4, Square = 16 }
{ Original = 4, Square = 16 }
{ Original = -5, Square = 25 }
{ Original = 5, Square = 25 }
As intended, the main sorting property is Square, but when two values have the same
square, the negative original number is always sorted before the positive one. Writing
a single comparison to do the same kind of thing (in a general case—there are mathe-
matical tricks to cope with this particular example) would’ve been significantly more
complicated, to the extent that you wouldn’t want to include the code inline in the
lambda expression.


<!-- PDF page 309 -->

Extension methods
One thing to note is that the ordering doesn’t change an existing collection—it
returns a new sequence that yields the same data as the input sequence, except sorted.
Contrast this with List<T>.Sort or Array.Sort, which both change the element
order within the list or array. LINQ operators are intended to be side-effect free: they
don’t affect their input, and they don’t make any other changes to the environment,
unless you’re iterating through a naturally stateful sequence (such as reading from a
network stream) or a delegate argument has side effects. This is an approach from
functional programming, and it leads to code that’s more readable, testable, compos-
able, predictable, thread-safe, and robust.
We’ve looked at just a few of the many extension methods available in Enumerable,
but hopefully you can appreciate how neatly they can be chained together. In the next
vided by C# 3 (query expressions), and we’ll look at some other operations we haven’t
covered here. It’s worth remembering that you don’t have to use query expressions—
often it can be simpler to make a couple of calls to methods in Enumerable, using
extension methods to chain operations together.
Now that you’ve seen how all these apply to the collection-of-numbers example, it’s
time for me to make good on the promise of showing you some business-related
examples.
10.3.6 Business examples involving chaining
Much of what we do as developers involves moving data around. In fact, for many appli-
cations that’s the only meaningful thing we do—the user interface, web services, data-
base, and other components often exist solely to get data from one place to another, or
from one form into another. It should come as no surprise that the extension methods
we’ve looked at in this section are well suited to many business problems.
I’ll just give a couple of examples here. I’m sure you’ll be able to imagine how C# 3
and the Enumerable class can help you solve problems involving your business require-
ments more expressively than before. For each example, I’ll only include a sample
query—it should be enough to help you understand the purpose of the code, but
without all the baggage. Full working code is on the book’s website.
AGGREGATION: SUMMING SALARIES
The first example involves a company composed of several departments. Each depart-
ment has a number of employees, each of whom has a salary. Suppose you want to
report on total salary cost by department, with the most expensive department listed
first. The query is simply as follows:
company.Departments
.Select(dept => new
{
dept.Name,
Cost = dept.Employees.Sum(person => person.Salary)
})
.OrderByDescending(deptWithCost => deptWithCost.Cost);


<!-- PDF page 310 -->

Extension methods in .NET 3.5
This query uses an anonymous type to keep the department name (using a projection
initializer) and the sum of the salaries of all the employees within that department.
The salary summation uses a self-explanatory Sum extension method, again part of
Enumerable.
In the result, the department name and total salary can be retrieved as properties.
If you wanted the original department reference, you’d just need to change the anon-
ymous type used in the Select method.
GROUPING: COUNTING BUGS ASSIGNED TO DEVELOPERS
If you’re a professional developer, I’m sure you’ve seen many project management
tools giving you different metrics. If you have access to the raw data, LINQ can help
you transform it in practically any way you choose.
As a simple example, let’s look at a list of developers and how many bugs they have
assigned to them at the moment:
bugs.GroupBy(bug => bug.AssignedTo)
.Select(list => new { Developer = list.Key, Count = list.Count() })
.OrderByDescending(x => x.Count);
This query uses the GroupBy extension method, which groups the original collection
by a projection (the developer assigned to fix the bug, in this case), resulting in an
IGrouping<TKey,TElement>. There are many overloads of GroupBy, but this example
uses the simplest one and then selects just the key (the name of the developer) and
the number of bugs assigned to him. After that you order the result to show the devel-
opers with the most bugs first.
One of the problems when looking at the Enumerable class can be working out
exactly what’s going on; for example, one of the overloads of GroupBy has four type
parameters and five normal parameters (three of which are delegates). Don’t panic—
just follow the steps shown in chapter 3, assigning different types to different type
parameters until you have a concrete example of what the method would look like.
That usually makes it a lot easier to understand what’s going on.
These examples aren’t particularly involved, but I hope you can see the power of
chaining method calls together, where each method takes an original collection and
returns another one in some form or other, whether by filtering out some values,
ordering values, transforming each element, aggregating some values, or using other
options. In many cases, the resulting code can be read aloud and understood immedi-
ately, and in other situations it’s still usually a lot simpler than the equivalent code
would’ve been in previous versions of C#.
We’ll use the example of defect tracking as our sample data when we look at
query expressions in the next chapter. Now that you’ve seen some of the extension
methods that are provided, let’s consider just how and when it makes sense to write
them yourself.


<!-- PDF page 311 -->

Extension methods
10.4
Usage ideas and guidelines
Like implicit typing of local variables, extension methods are controversial. It’d be dif-
ficult to claim that they make the overall aim of the code harder to understand in
many cases, but at the same time they do obscure the details of which method is get-
ting called. In the words of one of the lecturers at my university, “I’m hiding the truth
in order to show you a bigger truth.” If you believe that the most important aspect of
the code is its result, extension methods are great. If the implementation is more
important to you, then explicitly calling a static method is more clear. Effectively, it’s
the difference between the what and the how.
We’ve already looked at using extension methods for utility classes and method
chaining, but before we discuss the pros and cons further, it’s worth calling out a cou-
ple of aspects that may not be obvious.
10.4.1 “Extending the world” and making interfaces richer
Wes Dyer, a former developer on the C# compiler team, has a fantastic blog covering
all kinds of subject matter (see http://blogs.msdn.com/b/wesdyer/). One of his
posts about extension methods particularly caught my attention (see http://mng.bz/
I4F2). It’s called “Extending the World,” and it talks about how extension methods
can make code easier to read by effectively adapting your environment to your needs:
Typically for a given problem, a programmer is accustomed to building up a solution
until it finally meets the requirements. Now, it is possible to extend the world to meet the
solution instead of solely just building up until we get to it. That library doesn’t provide
what you need, just extend the library to meet your needs.
This has implications beyond situations where you’d use a utility class. Typically devel-
opers only start creating utility classes when they’ve seen the same kind of code repro-
duced in dozens of places, but extending a library is about clarity of expression as
much as avoiding duplication. Extension methods can make the calling code feel like
the library is richer than it really is.
You’ve already seen this with IEnumerable<T>, where even the simplest implemen-
tation appears to have a wide set of operations available, such as sorting, grouping, pro-
jection, and filtering. The benefits aren’t limited to interfaces—you can also “extend
the world” with enums, abstract classes, and so forth.
The .NET Framework also provides a good example of another use for extension
methods: fluent interfaces.
10.4.2 Fluent interfaces
There used to be a television program in the United Kingdom called Catchphrase. The
idea was that contestants would watch a screen where an animation would show some
cryptic version of a phrase or saying, which they’d have to guess. The host would often
try to help by instructing them: “Say what you see.” That’s pretty much the idea
behind fluent interfaces—that if you read the code verbatim, its purpose will leap off


<!-- PDF page 312 -->

Usage ideas and guidelines
the screen as if it were written in a natural human language. The term “fluent inter-
faces” was originally coined by Martin Fowler (see his blog entry at http://mng.bz/
3T9T) and Eric Evans.
If you’re familiar with domain-specific languages (DSLs), you may be wondering what
the differences are between a fluent interface and a DSL. A lot has been written on the
subject, but the consensus seems to be that a DSL has more freedom to create its own
syntax and grammar, whereas a fluent interface is constrained by the host language
(C#, in our case).
Some good examples of fluent interfaces in the framework are the OrderBy and
ThenBy methods: with a bit of interpretation of lambda expressions, the code explains
exactly what it does. In the case of listing 10.10 earlier, you could read “order by the
square, then by the original number” without much work. Statements end up reading
as whole sentences rather than individual noun-verb phrases.
Writing fluent interfaces can require a change of mindset. Method names defy the
normal descriptive-verb form, with And, Then, and If sometimes being suitable meth-
ods in a fluent interface. The methods themselves often do little more than set up con-
text for future calls, often returning a type whose sole purpose is to act as a bridge
between calls. Figure 10.2 illustrates how this bridging works. It only uses two extension
methods (on int and TimeSpan), but they make all the difference in the readability.
The grammar of the example in figure 10.2 could have many different forms; you
may be able to add additional attendees to an UntimedMeeting or create an Unat-
tendedMeeting at a particular time before specifying the attendees, for instance. For a
lot more guidance on DSLs, see DSLs in Boo: Domain-Specific Languages in .NET by
Ayende Rahien (Manning, 2010).
C# 3 only supports extension methods rather than extension properties, which restricts
fluent interfaces slightly. It means you can’t have expressions such as 1.week.from.now
or 2.days + 10.hours (which are both valid in Groovy with an appropriate package—
see Groovy’s Google Data Support: http://groovy.codehaus.org/Google+Data+
Support), but with a few superfluous parentheses you can achieve similar results. At first
it looks odd to call a method on a number (such as 2.Dollars() or 3.Meters()), but
it’s hard to deny that the meaning is clear. Without extension methods, this sort of
clarity isn’t possible when you need to act on types such as numbers that aren’t under
your control.
Returns SoloMeeting
Meeting.Between("Jon")
.And("Russell")
Returns UntimedMeeting
Figure 10.2
Pulling apart a fluent
interface expression to create a
meeting. The time of the meeting is
specified using extension methods to
create a TimeSpan from an int, and
a DateTime from a TimeSpan.
.At(8.OClock().Tomorrow())
Returns Meeting
Returns TimeSpan
Returns DateTime


<!-- PDF page 313 -->

Extension methods
At the time of this writing, the development community is still on the fence about flu-
ent interfaces: they’re relatively rare in most fields, although many mocking and unit
testing libraries have at least some fluent aspects. They’re certainly not universally
applicable, but in the right situations they can radically transform the readability of
the calling code. As an example, with appropriate extension methods from my Misc-
Util library, I can iterate over every day I’ve been alive in a readable way:
foreach (DateTime day in 19.June(1976).To(DateTime.Today)
.Step(1.Days()))
Although the range-related implementation details are complicated, the extension
methods allowing 19.June(1976) and 1.Days() are extremely simple. This is culture-
specific code, which you may not want to expose in your production code, but it can
make unit tests a great deal more pleasant.
These aren’t the only uses available for extension methods, of course. I’ve used
them for argument validation, implementing alternative approaches to LINQ, adding
my own operators to LINQ to Objects, making composite comparisons easier to build,
adding more flag-related functionality to enums, and much more. I’m constantly
amazed at how such a simple feature can have such a profound impact on readability
when used appropriately. The key word there is “appropriately,” which is easier to say
than describe.
10.4.3 Using extension methods sensibly
I’m in no position to dictate how you write your code. It may be possible to write tests
to objectively measure readability for an average developer, but it only matters for
those who’re going to use and maintain your code. You need to consult with the rele-
vant people as far as you can, presenting different options and getting appropriate
feedback. Extension methods make this particularly easy in many cases, as you can
demonstrate both options in working code simultaneously—turning a method into an
extension method doesn’t stop you from calling it explicitly in the same way as before.
The main question to ask is the one I referred to at the start of this section: is the
“what does it do” aspect of the code more important than the “how does it do it” aspect?
That varies by person and situation, but here are some guidelines to bear in mind:
Everyone on the development team should be aware of extension methods and
where they might be used. Where possible, avoid surprising code maintainers.
By putting extensions in their own namespace, you make it hard to use them
accidentally. Even if it’s not obvious when reading the code, the developers writ-
ing it should be aware of what they’re doing. Use a project-wide or company-
wide convention for naming the namespace. You may choose to take this one
step further and use a single namespace for each extended type. For instance,
you could create a TypeExtensions namespace for classes that extend
System.Type.


<!-- PDF page 314 -->

Usage ideas and guidelines
Think carefully before you extend widely used types, such as numbers or
object, or before you write a method where the extended type is a type param-
eter. Some guidelines go as far as to recommend that you shouldn’t do this at
all; I think such extensions have their place, but they should have to really earn
their place in your library. In this situation, it’s even more important that the
extension method be either internal or in its own namespace; I wouldn’t want
IntelliSense to be suggesting the June extension method everywhere I used an
integer, for example—only in classes that used at least some extension methods
related to date and time.
The decision to write an extension method should always be a conscious one. It
shouldn’t become habitual. Not every static method deserves to be an extension
method.
Document whether the first parameter (the value your method appears to be
called on) is allowed to be null—if it’s not, check the value in the method and
throw an ArgumentNullException if necessary.
Be careful not to use a method name that already has a meaning in the
extended type. If the extended type is a framework type or comes from a third-
party library, check all your extended method names whenever you change ver-
sions of the library. If you’re lucky (as I was with Stream.CopyTo), the new
meaning is the same as the old, but even so, you may wish to deprecate your
extension method.
Question your instincts, but acknowledge that they affect your productivity. Just
like with implicit typing, there’s little point in forcing yourself to use a feature
you instinctively dislike.
Try to group extension methods into static classes dealing with the same
extended type. Sometimes related classes (such as DateTime and TimeSpan) can
be sensibly grouped together, but avoid grouping extension methods targeting
disparate types such as Stream and string within the same class.
Think really carefully before adding extension methods with the same extended
type and same name in two different namespaces, particularly if there are situa-
tions where the different methods may both be applicable (they have the same
number of parameters). It’s reasonable for adding or removing a using direc-
tive to make a program fail to build, but it’s nasty if it still builds but changes the
behavior.
Few of these guidelines are particularly clear-cut; to some extent you’ll have to feel
your own way to the best use or avoidance of extension methods. It’s perfectly reason-
able to never write your own extension methods at all, and to use the LINQ-related
ones for the readability gains available there. But it’s worth at least thinking about
what’s possible.


<!-- PDF page 315 -->

Extension methods
10.5
Summary
The mechanical aspect of extension methods is straightforward—the feature is simple
to describe and demonstrate. The benefits (and costs) of them are harder to talk
about in a definitive manner—it’s a touchy-feely topic, and different people are
bound to have different views on the value provided.
In this chapter I’ve tried to show a bit of everything. Early on, we looked at what
the feature achieves in the language, and then we looked at some of the capabilities
available through the framework. In some ways, this was a relatively gentle introduc-
tion to LINQ; we’ll revisit some of the extension methods you’ve seen so far, and look
at some new ones, when we delve into query expressions in the next chapter.
A wide variety of methods is available within the Enumerable class, and we’ve only
scratched the surface in this chapter. It’s fun to come up with a scenario of your own
devising (whether hypothetical or in a real project) and browse through MSDN to see
what’s available to help you. I urge you to use a sandbox project of some sort to play
with the extension methods provided—it does feel like play rather than work, and
you’re unlikely to want to limit yourself to just the methods you need to achieve your
most immediate goal. Appendix A has a list of the standard query operators from
LINQ, which covers many of the methods within Enumerable.
New patterns and practices keep emerging in software engineering, and ideas
from some systems often cross-pollinate to others. That’s one of the things that keeps
development exciting. Extension methods allow code to be written in a way that was
previously unavailable in C#, creating fluent interfaces and changing the environment
to suit your code rather than the other way around. Those are just the techniques
we’ve looked at in this chapter—there are bound to be interesting future develop-
ments using the new C# features, whether individually or combined.
The revolution obviously doesn’t end here. For a few calls, extension methods are
fine. In the next chapter, we’ll look at the real power tools: query expressions and full-
blown LINQ.
