# Chapter 6: Implementing iterators the easy way

> Source: C# in Depth, Third Edition — Jon Skeet. Original PDF pages 190–212.

[← Table of contents](../README.md)


<!-- PDF page 190 -->

## Implementing iterators

## the easy way

This chapter covers
Implementing iterators in C# 1
Iterator blocks in C# 2
Sample iterator usage
Iterators as coroutines
The iterator pattern is an example of a behavioral pattern—a design pattern that sim-
plifies communication between objects. It’s one of the simplest patterns to under-
stand, and it’s incredibly easy to use. In essence, it allows you to access all the
elements in a sequence of items without caring about what kind of sequence it is—
an array, a list, a linked list, or none of the above. This can be effective for building
a data pipeline, where an item of data enters the pipeline and goes through a num-
ber of different transformations or filters before coming out the other end. Indeed,
this is one of the core patterns of LINQ, as you’ll see in part 3 of the book.
In .NET, the iterator pattern is encapsulated by the IEnumerator and IEnumerable
interfaces and their generic equivalents. (The naming is unfortunate—the pattern
is normally called iteration to avoid confusing it with other meanings of the word enu-
meration. I’ve used iterator and iterable throughout this chapter.) If a type implements


<!-- PDF page 191 -->

Implementing iterators the easy way
IEnumerable, that means it can be iterated over; calling the GetEnumerator method will
return the IEnumerator implementation, which is the iterator itself. You can think of
the iterator as being like a database cursor: a position within the sequence. The iterator
can only move forward within the sequence, and there can be many iterators operating
on the same sequence at the same time.
As a language, C# 1 has built-in support for consuming iterators using the foreach
statement. This makes it easy to iterate over collections—easier than using a straight
for loop—and it’s nicely expressive. The foreach statement compiles down to calls to
the GetEnumerator and MoveNext methods and the Current property, with support
for disposing of the iterator afterward if IDisposable has been implemented. It’s a
small but useful piece of syntactic sugar.
In C# 1, though, implementing an iterator is a relatively difficult task. C# 2 makes
this much simpler, which can sometimes lead to the iterator pattern being worth
implementing in cases where previously it would’ve caused more work than it saved.
In this chapter, we’ll look at what’s required to implement an iterator and at the
support given by C# 2. After we’ve looked at the syntax in detail, we’ll examine a few
examples from the real world, including an exciting (if slightly off-the-wall) use of the
iteration syntax in a concurrency library from Microsoft. I’ve held off providing the
examples until the end of the description, because there isn’t very much to learn, and
the examples will be a lot clearer when you can understand what the code is doing. If
you really want to read the examples first, they’re in sections 6.3 and 6.4.
As in other chapters, let’s start off by looking at what life was like before C# 2. We’ll
implement an iterator the hard way.
6.1
C# 1: The pain of handwritten iterators
You’ve already seen one example of an iterator implementation in section 3.4.3, when
we looked at what happens when you iterate over a generic collection. In some ways,
that was harder than a real C# 1 iterator implementation would’ve been, because you
implemented the generic interfaces as well—but it was also easier in other ways
because it wasn’t actually iterating over anything useful.
To put the C# 2 features into context, we’ll first implement an iterator that’s about
as simple as it can be while still providing real functionality. Suppose you wanted a
new type of collection based on a circular buffer. In this example, you’ll implement
IEnumerable so that users of your new class can easily iterate over all the values in the
collection. We’ll ignore the guts of the collection here and just concentrate on the
iteration side. Your collection will store its values in an array (object[]—no generics
here), and the collection will have the interesting feature that you can set its logical
starting point—so if the array had five elements, you could set the start point to 2 and
expect elements 2, 3, 4, 0, and then 1 to be returned. I won’t show the full circular
buffer code here, but it’s in the downloadable code.
To make the class easy to demonstrate, you’ll provide both the values and the start-
ing point in the constructor, so you should be able to write code such as the following
to iterate over the collection.


<!-- PDF page 192 -->

C# 1: The pain of handwritten iterators
Listing 6.1
Code using the (as yet unimplemented) new collection type
object[] values = {"a", "b", "c", "d", "e"};
IterationSample collection = new IterationSample(values, 3);
foreach (object x in collection)
{
Console.WriteLine (x);
}
Running listing 6.1 should (eventually) produce output of d, e, a, b, and finally c
because you specified a starting point of 3. Now that you know what you need to
achieve, let’s look at the skeleton of the class, as shown in the following listing.
Listing 6.2
Skeleton of the new collection type, with no iterator implementation
using System;
using System.Collections;
public class IterationSample : IEnumerable
{
object[] values;
int startingPoint;
public IterationSample(object[] values, int startingPoint)
{
this.values = values;
this.startingPoint = startingPoint;
}
public IEnumerator GetEnumerator()
{
throw new NotImplementedException();
}
}
You haven’t implemented GetEnumerator yet, but the rest of the code is ready to go.
And how do you go about writing the GetEnumerator code? The first thing to under-
stand is that you need to store some state somewhere. One important aspect of the
iterator pattern is that you don’t return all of the data in one go—the client asks for
one element at a time. That means you need to keep track of how far you’ve already
gone through your array. The stateful nature of iterators will be important when we
look at what the C# 2 compiler does, so keep a close eye on the state required in this
example.
Where should this state live? Suppose you tried to put it in the IterationSample
class, making that implement IEnumerator as well as IEnumerable. At first glance, this
looks like a good plan—after all, the data is in the right place, including the starting
point. Your GetEnumerator method could just return this. But there’s a big problem
with this approach: if GetEnumerator is called several times, several independent itera-
tors should be returned. For instance, you should be able to use two foreach state-
ments, one inside another, to get all possible pairs of values. The two iterators need
to be independent, which suggests you need to create a new object each time


<!-- PDF page 193 -->

Implementing iterators the easy way
GetEnumerator is called. You could still implement the functionality directly within
IterationSample, but then you’d have a class that didn’t have a single clear responsi-
bility—it would be pretty confusing.
Instead, let’s create another class to implement the iterator itself. You can use the
fact that in C# a nested type has access to its enclosing type’s private members, which
means you can store a reference to the parent IterationSample, along with the state
of how many iterations you’ve performed so far. This is shown in the following listing.
Listing 6.3
Nested class implementing the collection’s iterator
class IterationSampleIterator : IEnumerator
{
IterationSample parent;
int position;
Collection you’re
iterating over
B
How far
you’ve
iterated
C
internal IterationSampleIterator(IterationSample parent)
{
this.parent = parent;
position = -1;
}
Starts before first element
D
public bool MoveNext()
{
if (position != parent.values.Length)
{
position++;
}
return position < parent.values.Length;
}
Increments position if still going
E
public object Current
{
get
{
if (position == -1 ||
position == parent.values.Length)
{
throw new InvalidOperationException();
}
int index = position + parent.startingPoint;
index = index % parent.values.Length;
return parent.values[index];
}
}
Prevents access
before first or
after last element
F
Implements
wraparound
G
public void Reset()
{
position = -1;
}
}
Moves back to before
first element
H
What a lot of code to perform such a simple task! You remember the original collec-
tion of values you’re iterating over B and keep track of where you’d be in a simple
zero-based array C. To return an element, you offset that index by the starting


<!-- PDF page 194 -->

C# 2: Simple iterators with yield statements
point G. In keeping with the interface, you consider your iterator to start logically
before the first element D, so the client will have to call MoveNext before using the
Current property for the first time. The conditional increment at E makes the test
at F simple and correct even if MoveNext is called again after it’s first reported that no
more data is available. To reset the iterator, you set the logical position back to before
the first element H.
Most of the logic involved is fairly straightforward, although there’s plenty of room
for off-by-one errors; my first implementation failed its unit tests for precisely that rea-
son. The good news is that it works, and that you only need to implement IEnumerable
in IterationSample to complete the example:
public IEnumerator GetEnumerator()
{
return new IterationSampleIterator(this);
}
I won’t reproduce the combined code here, but it’s available on the book’s website,
including listing 6.1, which now produces the expected output.
It’s worth bearing in mind that this is a relatively simple example—there’s not a lot
of state to keep track of, and there’s no attempt to check whether the collection has
changed between iterations. With such a large burden involved to implement a simple
iterator, you shouldn’t be surprised at how rarely this pattern was implemented in
C# 1. Developers were generally happy to use foreach on the collections provided by
the framework, but more direct (and collection-specific) access when it came to their
own collections.
It took about 40 lines of code to implement the iterator in C# 1. Let’s see if C# 2
can do any better.
6.2
C# 2: Simple iterators with yield statements
I’ve always been the kind of person who likes to stay up until midnight on Christmas
Eve so I can open a present as soon as Christmas Day arrives. In the same way, I’d find
it almost impossible to wait any significant amount of time before showing you how
neat the solution is in C# 2.
6.2.1
Introducing iterator blocks and yield return
This chapter wouldn’t exist if C# 2 didn’t have a powerful feature that cuts down the
amount of code you have to write to implement iterators. In some other topics
the amount of code has only been reduced slightly, or the changes have just made
something more elegant. In this case, though, the amount of code required is
reduced massively. The following listing shows the complete implementation of the
GetEnumerator method in C# 2.


<!-- PDF page 195 -->

Implementing iterators the easy way
Listing 6.4
Iterating through the sample collection with C# 2 and yield return
public IEnumerator GetEnumerator()
{
for (int index = 0; index < values.Length; index++)
{
yield return values[(index + startingPoint) % values.Length];
}
}
Four lines of implementation, two of which are just braces. To be clear, that replaces
the whole of the IterationSampleIterator class. Completely. At least in the source
code…Later on you’ll see what the compiler has done behind the scenes and some of
the quirks of the implementation it’s provided, but for the moment let’s look at the
source code.
The method looks perfectly normal until you see the use of yield return. That’s
what tells the C# compiler that this isn’t a normal method, but one implemented with
an iterator block. The method is declared to return an IEnumerator, and you can only
use iterator blocks to implement methods1 that have a return type of IEnumerable,
IEnumerator, or one of the generic equivalents. The yield type of the iterator block is
object if the declared return type of the method is a nongeneric interface, or it’s the
type argument of the generic interface otherwise. For instance, a method declared to
return IEnumerable<string> would have a yield type of string.
No normal return statements are allowed within iterator blocks—only yield
return. All yield return statements in the block must try to return a value compati-
ble with the yield type of the block. In the previous example, you couldn’t write yield
return 1; in a method declared to return IEnumerable<string>.
RESTRICTIONS ON YIELD RETURN
There are a few further restrictions on yield
statements. You can’t use yield return inside a try block if it has any catch
blocks, and you can’t use yield return or yield break (which we’ll come to
shortly) in a finally block. That doesn’t mean you can’t use try/ catch or
try/finally blocks inside iterators—it just restricts what you can do in them.
If you want to know more about why these restrictions exist, Eric Lippert has a
whole series of blog posts about these and other design decisions involving
iterators: see http://mng.bz/EJ97.
The big idea that you need to get your head around when it comes to iterator blocks is
that although you’ve written a method that looks like it executes sequentially, what
you’ve actually asked the compiler to do is create a state machine for you. This is neces-
sary for exactly the same reason you had to put so much effort into implementing the
iterator in C# 1—the caller only wants to see one element at a time, so you need to
keep track of what you were doing when you last returned a value.
1 Or properties, as you’ll see later on. You can’t use an iterator block in an anonymous method, though.


<!-- PDF page 196 -->

C# 2: Simple iterators with yield statements
When the compiler encounters an iterator block, it creates a nested type for the
state machine. This type remembers exactly where you are within the block and the
values of local variables (including parameters). The generated class is somewhat simi-
lar to the longhand implementation you wrote earlier, in that it keeps all the necessary
state as instance variables. Let’s think about what this state machine has to do in order
to implement the iterator:
It has to have some initial state.
Whenever MoveNext is called, it has to execute code from the GetEnumerator
method until you’re ready to provide the next value (in other words, until you
hit a yield return statement).
When the Current property is used, it has to return the last value you yielded.
It has to know when you’ve finished yielding values so that MoveNext can return
false.
The second point in this list is the tricky one, because the state machine always needs
to restart the code from the point it had previously reached. Keeping track of the local
variables (as they appear in the method) isn’t too hard—they’re represented by
instance variables in the state machine. The restarting aspect is trickier, but the good
news is that unless you’re writing a C# compiler yourself, you needn’t care about how
it’s achieved: the result from a black-box point of view is that it just works. You can
write perfectly normal code within the iterator block, and the compiler is responsible
for making sure that the flow of execution is exactly as it would be in any other
method. The difference is that a yield return statement appears to only temporarily
exit the method—you could think of it as being paused, effectively.
Next we’ll examine the flow of execution in more detail and in a more visual way.
6.2.2
Visualizing an iterator’s workflow
It may help to think about how iterators execute in terms of a sequence diagram.
Rather than drawing the diagram by hand, the following listing prints it out. The iter-
ator provides a sequence of numbers (0, 1, 2, -1) and then finishes. The interesting
part isn’t the numbers provided so much as the flow of the code.
Listing 6.5
Showing the sequence of calls between an iterator and its caller
static readonly string Padding = new string(' ', 30);
static IEnumerable<int> CreateEnumerable()
{
Console.WriteLine("{0}Start of CreateEnumerable()", Padding);
for (int i=0; i < 3; i++)
{
Console.WriteLine("{0}About to yield {1}", Padding, i);
yield return i;
Console.WriteLine("{0}After yield", Padding);
}
Console.WriteLine("{0}Yielding final value", Padding);


<!-- PDF page 197 -->

Implementing iterators the easy way
yield return -1;
Console.WriteLine("{0}End of CreateEnumerable()", Padding);
}
...
IEnumerable<int> iterable = CreateEnumerable();
IEnumerator<int> iterator = iterable.GetEnumerator();
Console.WriteLine("Starting to iterate");
while (true)
{
Console.WriteLine("Calling MoveNext()...");
bool result = iterator.MoveNext();
Console.WriteLine("... MoveNext result={0}", result);
if (!result)
{
break;
}
Console.WriteLine("Fetching Current...");
Console.WriteLine("... Current result={0}", iterator.Current);
}
Listing 6.5 isn’t pretty, particularly around the iteration side of things. In the normal
course of events, you could just use a foreach loop, but to show exactly what’s hap-
pening when, I had to break the use of the iterator out into pieces. This code broadly
does what foreach does, although foreach also calls Dispose at the end. This is
important for iterator blocks, as we’ll discuss shortly. As you can see, there’s no differ-
ence in the syntax within the iterator method, even though this time you’re returning
IEnumerable<int> instead of IEnumerator<int>. Usually you’ll only want to return
IEnumerator<T> in order to implement IEnumerable<T>; if you want to just yield a
sequence from a method, return IEnumerable<T> instead.
Here’s the output from listing 6.5:
Starting to iterate
Calling MoveNext()...
Start of CreateEnumerable()
About to yield 0
... MoveNext result=True
Fetching Current...
... Current result=0
Calling MoveNext()...
After yield
About to yield 1
... MoveNext result=True
Fetching Current...
... Current result=1
Calling MoveNext()...
After yield
About to yield 2
... MoveNext result=True
Fetching Current...
... Current result=2
Calling MoveNext()...
After yield


<!-- PDF page 198 -->

C# 2: Simple iterators with yield statements
Yielding final value
... MoveNext result=True
Fetching Current...
... Current result=-1
Calling MoveNext()...
End of CreateEnumerable()
... MoveNext result=False
There are several important things to note in this output:
None of the code in CreateEnumerable is called until the first call to MoveNext.
It’s only when you call MoveNext that any real work gets done. Fetching Current
doesn’t run any of your code.
The code stops executing at yield return and picks up again just afterward at
the next call to MoveNext.
You can have multiple yield return statements in different places in the
method.
The code doesn’t end at the last yield return. Instead, the call to MoveNext
that causes you to reach the end of the method is the one that returns false.
The first point is particularly important, because it means you can’t use an iterator
block for any code that has to be executed immediately when the method is called,
such as code for argument validation. If you put normal checking into a method
implemented with an iterator block, it won’t behave nicely. You’ll almost certainly fall
foul of this at some point—it’s an extremely common error, and hard to understand
until you think about what the iterator block is doing. You’ll see the solution to the
problem in section 6.3.3.
There are two things you haven’t seen yet—an alternative way of halting the itera-
tion, and how finally blocks work in this somewhat odd form of execution. Let’s take
a look at them now.
6.2.3
Advanced iterator execution flow
In normal methods, the return statement has two effects. First, it supplies the value
the caller sees as the return value. Second, it terminates the execution of the method,
executing any appropriate finally blocks on the way out. You’ve seen that the yield
return statement temporarily exits the method, but only until MoveNext is called
again, and we haven’t examined the behavior of finally blocks at all. How can you
really stop the method, and what happens to all of those finally blocks? We’ll start
with a fairly simple construct—the yield break statement.
ENDING AN ITERATOR WITH YIELD BREAK
You can always find a way to give a method a single exit point, and many people work
hard to achieve this.2 The same techniques can be applied in iterator blocks. But
2 I find that the hoops you have to jump through to achieve this often make the code much harder to read than
having multiple return points, especially as try/finally is available for cleanup and you need to account
for the possibility of exceptions occurring anyway. The point is that it can be done.


<!-- PDF page 199 -->

Implementing iterators the easy way
should you wish to have an early out, the yield break statement is your friend. This
effectively terminates the iterator, making the current call to MoveNext return false.
The following listing demonstrates this by counting up to 100 but stopping early if
it runs out of time. This code also demonstrates the use of a method parameter in an
iterator block and proves that the name of the method is irrelevant.3
Listing 6.6
Demonstration of yield break
static IEnumerable<int> CountWithTimeLimit(DateTime limit)
{
for (int i = 1; i <= 100; i++)
{
if (DateTime.Now >= limit)
{
yield break;
}
yield return i;
}
}
...
DateTime stop = DateTime.Now.AddSeconds(2);
foreach (int i in CountWithTimeLimit(stop))
{
Console.WriteLine("Received {0}", i);
Thread.Sleep(300);
}
Stops if the time is up
Typically when you run listing 6.6, you’ll see about seven lines of output. The foreach
loop terminates perfectly normally—as far as it’s concerned, the iterator has just run
out of elements to iterate over. The yield break statement behaves much like a
return statement in a normal method.
So far, so simple. There’s one last aspect of execution flow to explore: how and
when finally blocks are executed.
EXECUTION OF FINALLY BLOCKS
You’re used to finally blocks executing whenever you leave the relevant scope. Itera-
tor blocks don’t behave quite like normal methods, though. As you’ve seen, a yield
return statement effectively pauses the method rather than exiting it. Following that
logic, you wouldn’t expect any finally blocks to be executed at that point, and they
aren’t. But appropriate finally blocks are executed when a yield break statement is
hit, just as you’d expect them to be when returning from a normal method.4
The most common use of finally in an iterator block is to dispose of resources,
typically with a convenient using statement. You’ll see a real-world example of this in
section 6.3.2, but for now we’re just trying to see how and when finally blocks are
3 Note that methods taking ref or out parameters can’t be implemented with iterator blocks.
4 finally blocks also work as expected when execution leaves the relevant scope without reaching either a
yield return or a yield break statement. I’m only focusing on the behavior of the two yield statements
here because that’s where the flow of execution is new and different.


<!-- PDF page 200 -->

C# 2: Simple iterators with yield statements
executed. The following listing shows this in action—it’s the same code as in listing 6.6,
but with a finally block. The changes are shown in bold.
Listing 6.7
Demonstration of yield break working with try/finally
static IEnumerable<int> CountWithTimeLimit(DateTime limit)
{
try
{
for (int i = 1; i <= 100; i++)
{
if (DateTime.Now >= limit)
{
yield break;
}
yield return i;
}
}
finally
{
Console.WriteLine("Stopping!");
}
}
...
DateTime stop = DateTime.Now.AddSeconds(2);
foreach (int i in CountWithTimeLimit(stop))
{
Console.WriteLine("Received {0}", i);
Thread.Sleep(300);
}
Executes however the loop ends
The finally block in listing 6.7 is executed whether the iterator block finishes by
counting to 100 or due to the time limit being reached. (It would also execute if the
code threw an exception.) But there are other ways you might try to avoid the finally
block from being called…Let’s try to be sneaky.
You’ve seen that code in the iterator block is only executed when MoveNext is
called. So what happens if you never call MoveNext? Or if you call it a few times and
then stop? Let’s consider changing the calling part of listing 6.7 to this:
DateTime stop = DateTime.Now.AddSeconds(2);
foreach (int i in CountWithTimeLimit(stop))
{
Console.WriteLine ("Received {0}", i);
if (i > 3)
{
Console.WriteLine("Returning");
return;
}
Thread.Sleep(300);
}
Here you’re not stopping early in the iterator code—you’re stopping early in the code
using the iterator. The output is perhaps surprising:


<!-- PDF page 201 -->

Implementing iterators the easy way
Received 1
Received 2
Received 3
Received 4
Returning
Stopping!
You can see that code is being executed after the return statement in the foreach
loop. That doesn’t normally happen unless a finally block is involved—and in this
case there are two! You already know about the finally block in the iterator method,
but the question is what’s causing it to be executed.
I gave a hint about this earlier—foreach calls Dispose on the iterator returned by
GetEnumerator in its own finally block (just like the using statement). When you
call Dispose on an iterator created with an iterator block before it’s finished iterating,
the state machine executes any finally blocks that are in the scope where the code is
currently “paused.” That’s a complicated and somewhat detailed explanation, but the
result is simpler to express: as long as callers use a foreach loop, finally works within
iterator blocks in the way you want it to.
You can easily prove that it’s the call to Dispose that triggers this by using the itera-
tor manually:
DateTime stop = DateTime.Now.AddSeconds(2);
IEnumerable<int> iterable = CountWithTimeLimit(stop);
IEnumerator<int> iterator = iterable.GetEnumerator();
iterator.MoveNext();
Console.WriteLine("Received {0}", iterator.Current);
iterator.MoveNext();
Console.WriteLine("Received {0}", iterator.Current);
This time the stopping line is never printed. If you explicitly add a call to Dispose,
you’ll see the extra line in the output again. It’s relatively rare that you’ll want to ter-
minate an iterator before it’s finished, and it’s relatively rare that you’ll be iterating
manually instead of using foreach, but if you do, remember to wrap the iterator in a
using statement.
We’ve now covered most of the behavior of iterator blocks, but before we end
this section, it’s worth considering a few oddities to do with the current Microsoft
implementation.
6.2.4
Quirks in the implementation
If you compile iterator blocks with the Microsoft C# 2 compiler and look at the result-
ing IL in either ildasm or Reflector, you’ll see the nested type that the compiler has
generated for you behind the scenes. In my case, when compiling listing 6.4, it was
called IterationSample.<GetEnumerator>d__0 (where the angle brackets make it an
unspeakable name—nothing to do with generics). I won’t go through exactly what’s
generated in detail here, but it’s worth looking at it in Reflector to get a feel for what’s
going on, preferably with the language specification next to you, open at section 10.14


<!-- PDF page 202 -->

C# 2: Simple iterators with yield statements
(“Iterators”); the specification defines different states the type can be in, and this
description makes the generated code easier to follow. The bulk of the work is per-
formed in MoveNext, which is generally a big switch statement.
Fortunately, as developers we don’t need to care much about the hoops the com-
piler has to jump through. But there are a few quirks about the implementation that
are worth knowing about:
Before MoveNext is called the first time, the Current property will always return
the default value for the yield type of the iterator.
After MoveNext has returned false, the Current property will always return the
final value yielded.

Reset always throws an exception instead of resetting like your manual imple-
mentation did. This is required behavior, laid down in the specification.
The nested class always implements both the generic and nongeneric forms
of IEnumerator (and the generic and nongeneric IEnumerable, where
appropriate).
Failing to implement Reset is reasonable—the compiler can’t work out what you’d
need to do in order to reset the iterator, or even whether it’s feasible. Arguably Reset
shouldn’t have been in the IEnumerator interface to start with, and I can’t remember
the last time I called it. Many collections don’t support it, so callers can’t generally rely
on it anyway.
Implementing extra interfaces does no harm either. It’s interesting that if your
method returns IEnumerable, you end up with one class implementing five interfaces
(including IDisposable). The language specification explains it in detail, but the
upshot is that as a developer you don’t need to worry. The fact that it implements both
IEnumerable and IEnumerator is slightly unusual—the compiler goes to some pains
to make sure that the behavior is correct whatever you do with it, but it also manages
to create a single instance of the nested type in the common case where you just iter-
ate through the collection in the same thread that created it.
The behavior of Current is odd—in particular, keeping hold of the last item after
supposedly moving off it could keep it from being garbage collected. It’s possible that
this may be fixed in a later release of the C# compiler, but it’s unlikely, as it could
break existing code (the Microsoft C# compilers shipping with .NET 3.5, 4, and 4.5
behave in the same way). Strictly speaking, it’s correct from the point of view of the
C# 2 language specification—the behavior of the Current property is undefined in
this situation. It’d be nicer, though, if it implemented the property in the way that the
framework documentation suggests, throwing exceptions at appropriate times.
Those are a few tiny drawbacks of using the autogenerated code, but sensible callers
won’t have any problems—and let’s face it, you’ve saved a lot of code in order to come
up with the implementation. This means it makes sense to use iterators more widely
than you might’ve done in C# 1. The next section provides some sample code so you
can check your understanding of iterator blocks and see how they’re useful in real life
rather than in theoretical scenarios.


<!-- PDF page 203 -->

Implementing iterators the easy way
6.3
Real-life iterator examples
Have you ever written some code that’s really simple in itself but that makes your proj-
ect much neater? It happens to me every so often, and it usually makes me happier
than it probably ought to—enough to get strange looks from colleagues, anyway. That
sort of childlike delight is particularly strong when it comes to using a new language
feature in a way that’s clearly nicer and you’re not just doing it for the sake of playing
with new toys.
Even now, after using iterators for a few years, I still come across situations where a
solution using iterator blocks presents itself, and the resulting code is brief, clean, and
easy to understand. In this section I’ll share three such scenarios with you.
6.3.1
Iterating over the dates in a timetable
While working on a project involving timetables, I came across a few loops, all of
which started like this:
for (DateTime day = timetable.StartDate;
day <= timetable.EndDate;
day = day.AddDays(1))
I was working on this area of code a lot, and I always hated that loop, but it was only
when I was reading the code out loud to another developer as pseudocode that I real-
ized I was missing a trick. I said something like, “For each day within the timetable…”
In retrospect, it’s obvious that what I really wanted was a foreach loop. (This may have
been obvious to you from the start—apologies if this is the case. Fortunately I can’t see
you looking smug.) The loop is much nicer when rewritten as follows:
foreach (DateTime day in timetable.DateRange)
In C# 1, I might’ve looked at that as a fond dream but not bothered implementing it;
you’ve seen how messy it is to implement an iterator by hand, and the end result only
made a few for loops neater in this case. In C# 2, though, it was easy. Within the class
representing the timetable, I simply added a property:
public IEnumerable<DateTime> DateRange
{
get
{
for (DateTime day = StartDate;
day <= EndDate;
day = day.AddDays(1))
{
yield return day;
}
}
}
This moved the original loop into the timetable class, but that’s okay—it’s much nicer
for it to be encapsulated there, in a property that just loops through the days, yielding
them one at a time, than to be in business code that was dealing with those days. If I


<!-- PDF page 204 -->

Real-life iterator examples
ever wanted to make it more complex (skipping weekends and public holidays, for
instance), I could do it in one place and reap the rewards everywhere.
This one small change made a massive improvement to the readability of the code
base. As it happens, I stopped refactoring at that point in the commercial code. I
thought about introducing a Range<T> type to represent a general-purpose range, but
as I only needed it in this one situation, it didn’t make sense to expend any more
effort on the problem. It turns out that was a wise move. In the first edition of this
book, I created just such a type—but it had some shortcomings that were hard to
address in a book-friendly manner. I redesigned it significantly for my utility library,
but I still have a few misgivings. Types like this often sound simpler than they really
are, and soon you end up with a corner case to be handled at every turn. The details
of the difficulties I encountered don’t really belong in this book—they’re more points
about general design than C#—but they’re interesting in their own right, so I’ve writ-
ten them up as an article on the book’s website (see http://mng.bz/GAmS).
The next example is one of my favorites—it demonstrates everything I love about
iterator blocks.
6.3.2
Iterating over lines in a file
How often have you read a text file line by line? It’s an incredibly common task. As of
.NET 4, the framework finally provides a method to make this easier in File.Read-
Lines, but if you’re using an earlier version of the framework, you can write your own
version really easily, as I’ll show in the next couple of pages.
I dread to think how often I’ve written code like this:
using (TextReader reader = File.OpenText(filename))
{
string line;
while ((line = reader.ReadLine()) != null)
{
// Do something with line
}
}
We have four separate concepts here:
How to obtain a TextReader
Managing the lifetime of the TextReader
Iterating over the lines returned by TextReader.ReadLine
Doing something with each of those lines
Only the first and last of these are generally specific to the situation—the lifetime
management and the mechanism for iterating are just boilerplate code. (At least, the
lifetime management is simple in C#. Thank goodness for using statements!) There
are two ways you could improve things. You could use a delegate—write a utility
method that would take a reader and a delegate as parameters, call the delegate for
each line in the file, and close the reader at the end. That’s often used as an example


<!-- PDF page 205 -->

Implementing iterators the easy way
of closures and delegates, but there’s an alternative that I find more elegant and that
fits in much better with LINQ. Instead of passing your logic into a method as a dele-
gate, you can use an iterator to return a single line at a time from the file, so you can
use the normal foreach loop.
You can achieve this using a whole type implementing IEnumerable<string> (I
have a LineReader class in my MiscUtil library for this purpose), but a standalone
method in another class will work fine, too. It’s really simple, as the next listing proves.
Listing 6.8
Looping over the lines in a file using an iterator block
static IEnumerable<string> ReadLines(string filename)
{
using (TextReader reader = File.OpenText(filename))
{
string line;
while ((line = reader.ReadLine()) != null)
{
yield return line;
}
}
}
...
foreach (string line in ReadLines("test.txt"))
{
Console.WriteLine(line);
}
The body of the method is pretty much exactly what you had before, except that what
you’re doing with the line is yielding it to the caller when it iterates over the collec-
tion. As before, you open the file, read a line at a time, and then close the reader
when you’ve finished…although the concept of “when you’ve finished” is more inter-
esting in this case than with a using statement in a normal method, where the flow
control is more obvious.
This is why it’s important that the foreach loop dispose of the iterator—because
that’s what makes sure the reader gets cleaned up. The using statement in the iterator
method is acting as a try/finally block; that finally block will execute if either you
get to the end of the file or you call Dispose on the IEnumerator<string> when you’re
part of the way through. It’d be possible for calling code to abuse the IEnumerator
<string> returned by ReadLines(...).GetEnumerator() and end up with a resource
leak, but that’s usually the case with IDisposable—if you don’t call Dispose, you may
leak resources. It’s rarely a problem though, as foreach does the right thing. It’s
important to be aware of this potential abuse—if you relied on some sort of try/
finally block in an iterator to grant some permission and then remove it again later,
that really would be a security hole.
This method encapsulates the first three of the four concepts I listed earlier, but
it’s a bit restrictive. It’s reasonable to lump together the lifetime management and iter-
ation aspects, but what if you want to read text from a network stream instead? Or if


<!-- PDF page 206 -->

Real-life iterator examples
you want to use an encoding other than UTF-8? You need to put the first part back in
the control of the caller, and the most obvious approach would be to change the
method signature to accept a TextReader, like this:
static IEnumerable<string> ReadLines(TextReader reader)
This is a bad idea, though. You want to take ownership of the reader so that you can
clean it up conveniently for the caller, but the fact that you take responsibility for the
cleanup means you have to clean it up, as long as the caller uses the result sensibly.
The problem is, if something happens before the first call to MoveNext(), you’re
never going to have any chance to clean up: none of your code will run. The
IEnumerable<string> itself isn’t disposable, and yet it would’ve stored this piece of
state, which required disposal. Another problem would occur if GetEnumerator()
were called twice: that ought to generate two independent iterators, but they’d both
be using the same reader. You could mitigate this somewhat by changing the return
type to IEnumerator<string>, but that would mean the result couldn’t be used in a
foreach loop, and you still wouldn’t get to run any cleanup code if you never got as
far as the first MoveNext() call. Fortunately, there’s a way around this.
Just as the code doesn’t get to run immediately, you don’t need the reader immedi-
ately. What you need is a way of getting the reader when you need it. You could use an
interface to represent the idea of “I can provide a TextReader when you want one,” but
the idea of a single method interface should usually make you reach for a delegate.
Instead, I’m going to cheat slightly by introducing a delegate that’s part of .NET 3.5. It’s
overloaded by different numbers of type parameters, but you only need one:
public delegate TResult Func<TResult>()
As you can see, this delegate has no parameters, but it returns a result of the same type
as the type parameter. It’s a classic provider or factory signature. In this case, you want
to get a TextReader, so you can use Func<TextReader>. The changes to the method
are simple:
static IEnumerable<string> ReadLines(Func<TextReader> provider)
{
using (TextReader reader = provider())
{
string line;
while ((line = reader.ReadLine()) != null)
{
yield return line;
}
}
}
Now the resource is acquired just before you need it, and by that point you’re in the
context of IDisposable, so you can release the resource at the appropriate time. Fur-
thermore, if GetEnumerator() is called multiple times on the returned value, each
call will result in an independent TextReader being created.


<!-- PDF page 207 -->

Implementing iterators the easy way
You can easily use anonymous methods to add overloads to open files, optionally
specifying an encoding:
static IEnumerable<string> ReadLines(string filename)
{
return ReadLines(filename, Encoding.UTF8);
}
static IEnumerable<string> ReadLines(string filename, Encoding encoding)
{
return ReadLines(delegate {
return File.OpenText(filename, encoding);
});
}
This example uses generics, an anonymous method (which captures parameters), and
an iterator block. All that’s missing is nullable value types and you’d have the full
house of C# 2’s major features. I’ve used this code on a number of occasions, and it’s
always much cleaner than the cumbersome code we started off with. As I mentioned
earlier, if you’re using a recent version of .NET, you’ve got all this available in
File.ReadLines anyway, but it’s still a neat example of just how useful iterator blocks
can be.
As a final example, let’s get a first taste of LINQ—even though we’ll only use C# 2.
6.3.3
Filtering items lazily using an iterator block and a predicate
Even though we haven’t started to look at LINQ properly yet, I’m sure you have some
idea of what it’s about: it allows you to query data in a simple and powerful way across
multiple data sources, such as in-memory collections and databases. C# 2 doesn’t have
any of the language integration for query expressions, nor the lambda expressions
and extension methods that can make it so concise, but you can still achieve some of
the same effects.
One of the core features of LINQ is filtering with the Where method. You provide a
collection and a predicate, and the result is a lazily evaluated query that’ll yield only the
items in the collection that match the predicate. This is a little like List<T>.FindAll,
but it’s lazy and works with any IEnumerable<T>. One of the beautiful things about
LINQ5 is that the cleverness is in the design. It’s quite simple to implement LINQ to
Objects as we’ll prove now, at least for the Where method. Ironically, even though most
of the language features that make LINQ shine are part of C# 3, these are almost all
about how you can access methods such as Where, rather than how they’re implemented.
The following listing shows a full example, including simple argument validation,
and uses the filter to display all the using directives in the source file that contains the
sample code itself.
5 Or to be more precise, LINQ to Objects. LINQ providers for databases and the like are far more complex.


<!-- PDF page 208 -->

Real-life iterator examples
Listing 6.9
Implementing LINQ’s Where method using iterator blocks
public static IEnumerable<T> Where<T>(IEnumerable<T> source,
Predicate<T> predicate)
{
if (source == null || predicate == null)
{
throw new ArgumentNullException();
}
return WhereImpl(source, predicate);
}
Eagerly checks arguments
B
Lazily processes data
C
private static IEnumerable<T> WhereImpl<T>(IEnumerable<T> source,
Predicate<T> predicate)
{
foreach (T item in source)
{
if (predicate(item))
{
yield return item;
}
}
}
...
IEnumerable<string> lines = LineReader.ReadLines("../../FakeLinq.cs");
Predicate<string> predicate = delegate(string line)
{ return line.StartsWith("using"); };
foreach (string line in Where(lines, predicate))
{
Console.WriteLine(line);
}
Tests current item against predicate
D
This example splits the implementation into two parts: argument validation and the
real business logic of filtering. It’s slightly ugly but entirely necessary for sensible error
handling. Suppose you put everything in the same method—what would happen
when you called Where<string>(null, null)? The answer is nothing…or, at least, the
desired exception wouldn’t be thrown. This is due to the lazy semantics of iterator
blocks: none of the code in the body of the method runs until the first call to Move-
Next(), as you saw in section 6.2.2. Typically you want to check the preconditions to
the method eagerly—there’s no point in delaying the exception, and it just makes
debugging harder.
The standard workaround for this is to split the method in half, as in listing 6.9.
First you check the arguments B in a normal method, and then you call the method
implemented using an iterator block to lazily process the data as and when it’s
requested C.
The iterator block itself is mind-numbingly straightforward: for each item in the
original collection, you test the predicate D and yield the value if it matches. If it
doesn’t match, you try the next item, and so on until you find something that does
match, or you run out of items. It’s straightforward, but a C# 1 implementation
would’ve been much harder to follow (and couldn’t have been generic, of course).


<!-- PDF page 209 -->

Implementing iterators the easy way
The final piece of code to demonstrate the method in action uses the previous
example to provide the data—in this case, the source code of the implementation.
The predicate simply tests a line to see whether it begins with “using”—it could con-
tain far more complicated logic, of course. I’ve created separate variables for the data
and the predicate just to make the formatting clearer, but it could all have been writ-
ten inline. It’s important to note the principal difference between this example and
the equivalent that could’ve been achieved using File.ReadAllLines and Array
.FindAll<string>. This implementation is entirely lazy and streaming. Only a single
line from the source file is ever required in memory at a time. Of course, that
wouldn’t matter in this particular case where the file is small—but if you imagine a
multigigabyte log file, you can see the benefits of this approach.
I hope these examples have given you an inkling of why iterator blocks are so
important—as well as perhaps a desire to hurry on and find out more about LINQ.
Before that, I’d like to mess with your mind a bit and introduce you to a thoroughly
bizarre (but really neat) use of iterators.
6.4
Pseudo-synchronous code with the Concurrency
and Coordination Runtime
The Concurrency and Coordination Runtime (CCR) is a library developed by Microsoft to
offer an alternative way of writing asynchronous code that’s amenable to complex
coordination. At the time of this writing, it’s only available as part of the Microsoft
Robotics Studio (see http://www.microsoft.com/robotics). Microsoft has been put-
ting a lot of resources into concurrency in various projects, most notably the Task Par-
allel Library introduced in .NET 4, and the asynchronous language features in C# 5
(supported by a lot of asynchronous APIs). But I wanted to use the CCR to show you
how iterator blocks can change the whole execution model. Indeed, it’s no coinci-
dence that this early foray into an alternative approach to concurrency uses iterator
blocks to change the execution model; the similarities between the state machines
generated for iterator blocks and those used for asynchronous functions in C# 5 are
striking.
The sample code does work (against dummy services) but the ideas are more
important than the details.
Suppose you’re writing a server that needs to handle lots of requests. As part of
dealing with those requests, you need to first call a web service to fetch an authentica-
tion token, and then use that token to get data from two independent data sources
(say, a database and another web service). You then process that data and return the
result. Each of the fetch stages could take a while—perhaps a few seconds. Normally
you might consider the simple synchronous route or the stock asynchronous
approach. The synchronous version might look something like this:
HoldingsValue ComputeTotalStockValue(string user, string password)
{
Token token = AuthService.Check(user, password);
Holdings stocks = DbService.GetStockHoldings(token);


<!-- PDF page 210 -->

Pseudo-synchronous code with the Concurrency and Coordination Runtime
StockRates rates = StockService.GetRates(token);
return ProcessStocks(stocks, rates);
}
That’s easy to understand, but if each request takes 2 seconds, the whole operation
will take 6 seconds and tie up a thread for the whole time it’s running. If you want to
scale up to hundreds of thousands of requests running in parallel, you’re in trouble.
Now let’s consider a fairly simple asynchronous version, which avoids tying up a
thread when nothing’s happening6 and uses parallel calls where possible:
void StartComputingTotalStockValue(string user, string password)
{
AuthService.BeginCheck(user, password, AfterAuthCheck, null);
}
void AfterAuthCheck(IAsyncResult result)
{
Token token = AuthService.EndCheck(result);
IAsyncResult holdingsAsync = DbService.BeginGetStockHoldings
(token, null, null);
StockService.BeginGetRates(token, AfterGetRates, holdingsAsync);
}
void AfterGetRates(IAsyncResult result)
{
IAsyncResult holdingsAsync = (IAsyncResult)result.AsyncState;
StockRates rates = StockService.EndGetRates(result);
Holdings stocks = DbService.EndGetStockHoldings(holdingsAsync);
OnRequestComplete(ProcessStocks(stocks, rates));
}
This is much harder to read and understand—and that’s only a simple version. The
coordination of the two parallel calls is only achievable in a simple way because you
don’t need to pass any other state around, and even so it’s not ideal. If the stock ser-
vice call completes quickly, you’ll still block a thread-pool thread waiting for the data-
base call to complete. More importantly, it’s far from obvious what’s going on, because
the code jumps between different methods.
By now you may be asking yourself where iterators come into the picture. Well, the
iterator blocks provided by C# 2 effectively allow you to pause current execution at
certain points of the flow through the block and then come back to the same place,
with the same state. The clever folks designing the CCR realized that that’s exactly
what’s needed for a continuation-passing style of coding. You need to tell the system that
there are certain operations you need to perform—including starting other opera-
tions asynchronously—but that you’re then happy to wait until the asynchronous
operations have finished before you continue. You do this by providing the CCR with
an implementation of IEnumerator<ITask> (where ITask is an interface defined by
the CCR). Here’s some code to achieve the same results using this style:
6 Well, mostly. It might still be inefficient, as you’ll see in a moment.


<!-- PDF page 211 -->

Implementing iterators the easy way
static IEnumerator<ITask> ComputeTotalStockVal.(str.user,str.pass)
{
string token = null;
yield return Arbiter.Receive(false, AuthService.CcrCheck(user, pass),
delegate(string t) { token = t; });
IEnumerable<Holding> stocks = null;
IDictionary<string,decimal> rates = null;
yield return Arbiter.JoinedReceive(false,
DbService.CcrGetStockHoldings(token),
StockService.CcrGetRates(token),
delegate(IEnumerable<Holding> s, IDictionary<string,decimal> r)
{ stocks = s; rates = r; });
OnRequestComplete(ComputeTotal(stocks, rates));
}
Confused? I certainly was when I first saw it, but now I’m in awe of how neat it is. The
CCR calls into your code (with a call to MoveNext on the iterator), and you execute
until and including the first yield return statement. The CcrCheck method within
AuthService kicks off an asynchronous request, and the CCR waits (without using a
dedicated thread) until it has completed, calling the supplied delegate to handle the
result. It then calls MoveNext again, and your method continues. This time you kick off
two requests in parallel and ask the CCR to call another delegate with the results of
both operations when they’ve both finished. After that, MoveNext is called for a final
time, and you get to complete the request processing.
Although it’s obviously more complicated than the synchronous version, it’s still all
in one method, it gets executed in the order written, and the method itself can hold
the state (in the local variables, which become state in the extra type generated by the
compiler). It’s fully asynchronous, using as few threads as it can get away with. I
haven’t shown any error handling, but that’s also available in a sensible fashion that
forces you to think about the issue at appropriate places.
I’ve deliberately not gone into the details of the Arbiter class, the ITask interface,
and so forth here. I’m not trying to promote the CCR in this section, although it’s fas-
cinating to read about and experiment with; I suspect that asynchronous functions in
C# 5 will have much more impact on mainstream developers. My point here has been
to show that iterators can be used in radically different contexts that have little to do
with traditional collections. At the heart of this use of them is the idea of a state
machine: two of the tricky aspects of asynchronous development are handling state
and effectively pausing until something interesting happens. Iterator blocks are a nat-
ural fit for both of these problems, although you’ll see in chapter 15 how more tar-
geted language support makes things much cleaner.
6.5
Summary
C# supports many patterns indirectly, in terms of it being feasible to implement them
in C#. But relatively few patterns are directly supported in terms of language features
being specifically targeted at a particular pattern. In C# 1, the iterator pattern was


<!-- PDF page 212 -->

Summary
directly supported from the point of view of the calling code, but not from the per-
spective of the collection being iterated over. Writing a correct implementation of
IEnumerable was time consuming and error-prone, without being interesting. In C# 2,
the compiler does all the mundane work for you, building a state machine to cope
with the callback nature of iterators.
It should be noted that iterator blocks have one aspect in common with the anony-
mous methods you saw in chapter 5, even though the actual features are very differ-
ent. In both cases, extra types may be generated, and a potentially complicated code
transformation is applied to the original source. Compare this with C# 1, where most
of the transformations for syntactic sugar (lock, using, and foreach being the most
obvious examples) were straightforward. You’ll see this trend toward smarter compila-
tion continuing with almost every aspect of C# 3.
I’ve shown you one piece of LINQ-related functionality in this chapter: filtering a
collection. IEnumerable<T> is one of the most important types in LINQ, and if you
ever want to write your own LINQ operators on top of LINQ to Objects,7 you’ll be eter-
nally grateful to the C# team for including iterator blocks in the language.
In addition to seeing some real-life examples of the use of iterators, we’ve looked
at how one particular library has used them in a fairly radical way that has little to do
with what likely comes to mind when you think about iteration over a collection. It’s
worth bearing in mind that many languages have also looked at this sort of problem
before—in computer science, the term coroutine is applied to concepts of this nature,
and that’s how they’re referred to in the Unity 3D game development toolset, where
again they’re used for asynchrony. Different languages have historically supported
them to a greater or lesser extent, with tricks being applicable to simulate them some-
times. For example, Simon Tatham has an excellent article on how even C can express
coroutines if you’re willing to bend coding standards somewhat (see his “Coroutines
in C” article at http://mng.bz/H8YX). You’ve seen that C# 2 makes coroutines easy to
write and use.
Now that you’ve seen some major and sometimes mind-warping language changes
focused around a few key features, the next chapter will be a change of pace. It
describes a number of small changes that make C# 2 more pleasant to work with than
its predecessor. The designers learned from the little niggles of the past and produced
a language that has fewer rough edges, more scope for dealing with awkward
backward-compatibility cases, and a better story around working with generated code.
Each feature is relatively straightforward, but there are quite a few of them.
7 This is less daunting and more fun than it sounds. We’ll look at a few guidelines around this topic in chap-
ter 12.
