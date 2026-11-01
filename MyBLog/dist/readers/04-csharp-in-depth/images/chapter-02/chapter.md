# Chapter 2: Core foundations: building on C# 1

> Source: C# in Depth, Third Edition — Jon Skeet. Original PDF pages 60–89.

[← Table of contents](../README.md)


<!-- PDF page 60 -->

## Core foundations:

## building on C# 1

This chapter covers
Delegates
Type system characteristics
Value/reference types
This isn’t a refresher on the whole of C# 1. Let’s get that out of the way immediately.
I couldn’t do justice to any topic in C# if I had to cover the whole of the first version
in a single chapter. I’ve written this book assuming that you’re at least reasonably
competent in C# 1. What counts as “reasonably competent” is, of course, somewhat
subjective, but I’ll assume you’d at least be happy to walk into an interview for a
junior C# developer role and answer technical questions appropriate to that job.
You may well have more experience, but that’s the level of knowledge I’m assuming.
In this chapter, we’ll focus on three areas of C# 1 that are particularly important
in order to understand the features of later versions. This should raise the lowest
common denominator a little, so that I can make slightly greater assumptions later
in the book. Given that it is a lowest common denominator, you may find you
already have a perfect understanding of all the concepts in this chapter. If you
believe that’s the case without even reading the chapter, then feel free to skip it.


<!-- PDF page 61 -->

Core foundations: building on C# 1
You can always come back later if it turns out something isn’t as simple as you thought.
If you’re not certain you know everything in this chapter, you might want to look at
the summary at the end of each section, which highlights the important points—if any
of those sound unfamiliar, it’s worth reading that section in detail.
We’ll start off by looking at delegates, then consider how the C# type system com-
pares with some other possibilities, and finally look at the differences between value
types and reference types. For each topic, I’ll describe the ideas and behavior, as well
as take the opportunity to define terms so that I can use them later on. After we’ve
looked at how C# 1 works, I’ll show you a quick preview of how many of the new fea-
tures in later versions relate to the topics examined in this chapter.
2.1
Delegates
I’m sure you already have an instinctive idea about what a delegate is, even though it
can be hard to articulate. If you’re familiar with C and had to describe delegates to
another C programmer, the term function pointer would no doubt crop up. Essentially,
delegates provide a level of indirection: instead of specifying behavior to be executed
immediately, the behavior can somehow be “contained” in an object. That object can
then be used like any other, and one operation you can perform with it is to execute
the encapsulated action. Alternatively, you can think of a delegate type as a single-
method interface, and a delegate instance as an object implementing that interface.
If that’s just gobbledygook to you, maybe an example will help. It’s slightly morbid,
but it does capture what delegates are all about. Consider your will—your last will and
testament. It’s a set of instructions: “pay the bills, make a donation to charity, leave the
rest of my estate to the cat,” for instance. You write it before your death, and leave it in
an appropriately safe place. After your death, your attorney will (you hope!) act on
those instructions.
A delegate in C# acts like your will does in the real world—it allows you to specify a
sequence of actions to be executed at the appropriate time. Delegates are typically
used when the code that wants to execute the actions doesn’t know the details of what
those actions should be. For instance, the only reason why the Thread class knows
what to run in a new thread when you start it is because you provide the constructor
with a ThreadStart or ParameterizedThreadStart delegate instance.
We’ll start our tour of delegates with the four absolute basics, without which none
of the rest would make sense.
2.1.1
A recipe for simple delegates
In order for a delegate to do anything, four things need to happen:
The delegate type needs to be declared.
The code to be executed must be contained in a method.
A delegate instance must be created.
The delegate instance must be invoked.
Let’s take each step of this recipe in turn.


<!-- PDF page 62 -->

Delegates
DECLARING THE DELEGATE TYPE
A delegate type is effectively a list of parameter types and a return type. It specifies what
kind of action can be represented by instances of the type.
For instance, consider a delegate type declared like this:
delegate void StringProcessor(string input);
The code says that if you want to create an instance of StringProcessor, you’ll need a
method with one parameter (a string) and a void return type (the method doesn’t
return anything).
It’s important to understand that StringProcessor really is a type, deriving from
System.MulticastDelegate, which in turn derives from System.Delegate. It has
methods, you can create instances of it and pass around references to instances, the
whole works. There are obviously a few special features, but if you’re ever stuck won-
dering what’ll happen in a particular situation, first think about what would happen if
you were using a normal reference type.
SOURCE OF CONFUSION: THE AMBIGUOUS TERM DELEGATE
Delegates can be mis-
understood because the word delegate is often used to describe both a delegate
type and a delegate instance. The distinction between these two is exactly the
same as between any other type and instances of that type—the string type
itself is different from a particular sequence of characters, for example. I’ve
used the terms delegate type and delegate instance throughout this chapter to try
to keep clear exactly what I’m talking about at any point.
We’ll use the StringProcessor delegate type when we consider the next ingredient.
FINDING AN APPROPRIATE METHOD FOR THE DELEGATE INSTANCE’S ACTION
The next ingredient is to find (or write) a method that does what you want and has
the same signature as the delegate type you’re using. The idea is to make sure that
when you try to invoke a delegate instance, the parameters you use will all match up,
and you’ll be able to use the return value (if any) in the way you expect—just like a
normal method call.
Consider these five method signatures as candidates to be used for a String-
Processor instance:
void PrintString(string x)
void PrintInteger(int x)
void PrintTwoStrings(string x, string y)
int GetStringLength(string x)
void PrintObject(object x)
The first method has everything right, so you can use it to create a delegate instance.
The second method has one parameter, but it’s not string, so it’s incompatible with
StringProcessor. The third method has the correct first parameter type, but it has
another parameter as well, so it’s still incompatible. The fourth method has the right
parameter list but a nonvoid return type. (If your delegate type had a return type, the
return type of the method would have to match that too.)


<!-- PDF page 63 -->

Core foundations: building on C# 1
The fifth method is interesting—any time you invoke a StringProcessor instance,
you could call the PrintObject method with the same arguments, because string
derives from object. It would make sense to be able to use it for an instance of
StringProcessor, but in C# 1 the delegate must have exactly the same parameter
types.1 C# 2 changes this situation—see chapter 5 for more details. In some ways, the
fourth method is similar, since you could always ignore the unwanted return value.
But void and nonvoid return types are currently always deemed to be incompatible.
This is partly because other aspects of the system (particularly the JIT) need to know
whether a value will be left on the stack as a return value when a method is executed.2
Let’s assume you have a method body for the compatible signature (PrintString)
and move on to the next ingredient—the delegate instance itself.
CREATING A DELEGATE INSTANCE
Now that you have a delegate type and a method with the right signature, you can cre-
ate an instance of that delegate type, specifying that this method be executed when
the delegate instance is invoked. No official terminology has been defined for this,
but for this book I’ll call it the action of the delegate instance.
The exact form of the expression used to create the delegate instance depends on
whether the action uses an instance method or a static method. Suppose PrintString
is a static method in a type called StaticMethods and an instance method in a type
called InstanceMethods. Here are two examples of creating an instance of String-
Processor:
StringProcessor proc1, proc2;
proc1 = new StringProcessor(StaticMethods.PrintString);
InstanceMethods instance = new InstanceMethods();
proc2 = new StringProcessor(instance.PrintString);
When the action is a static method, you only need to specify the type name. When the
action is an instance method, you need an instance of the type (or a derived type), as
you normally would. This object is called the target of the action, and when the dele-
gate instance is invoked, the method will be called on that object. If the action is
within the same class (as it often is, particularly when you’re writing event handlers in
UI code), you don’t need to qualify it either way—the this reference is used implicitly
for instance methods.3 Again, these rules act just as if you were calling the method
directly.
UTTER GARBAGE! (OR NOT, AS THE CASE MAY BE)
It’s worth being aware that a
delegate instance will prevent its target from being garbage collected if the
delegate instance itself can’t be collected. This can result in apparent
1 In addition to the parameter types, you have to match whether the parameter is in (the default), out, or ref.
It’s reasonably rare to use out and ref parameters with delegates, though.
2 This is a deliberately vague use of the word stack to avoid going into too much irrelevant detail. See Eric Lip-
pert’s blog post “The void is invariant” for more information (http://mng.bz/4g58).
3 Of course, if the action is an instance method and you’re trying to create a delegate instance from within a
static method, you’ll still need to provide a reference to be the target.


<!-- PDF page 64 -->

Delegates
memory leaks, particularly when a short-lived object subscribes to an event in
a long-lived object, using itself as the target. The long-lived object indirectly
holds a reference to the short-lived one, prolonging its lifetime.
There’s not much point in creating a delegate instance if it doesn’t get invoked at
some point. Let’s look at the last step—the invocation.
INVOKING A DELEGATE INSTANCE
Invoking a delegate instance is the really easy bit:4 it’s just a matter of calling a method
on the delegate instance. The method itself is called Invoke, and it’s always present in
a delegate type with the same list of parameters and return type that the delegate type
declaration specifies. In our continuing example,
there’s a method like this:
![Figure from PDF page 64](images/page-064-figure-0036.png)

proc1("Hello");
void Invoke(string input)
Compiles to...
Calling Invoke will execute the action of the delegate
instance, passing on whatever arguments you’ve speci-
fied in the call to Invoke, and (if the return type isn’t
void) returning the return value of the action.
As simple as this is, C# makes it even easier; if you
have a variable5 whose type is a delegate type, you can
treat it as if it were a method itself. It’s easiest to see
this happening as a chain of events occurring at differ-
ent times, as shown in figure 2.1.
As you can see, that’s simple too. All the ingredi-
ents are now in place, so you can preheat your CLR to
200°C, stir everything together, and see what happens.
![Figure from PDF page 64](images/page-064-figure-0037.png)

proc1.Invoke("Hello");
Which at
execution
time invokes...
![Figure from PDF page 64](images/page-064-figure-0038.png)

PrintString("Hello");
Figure 2.1
Processing a call to a
delegate instance that uses the
C# shorthand syntax
A COMPLETE EXAMPLE AND SOME MOTIVATION
It’s easiest to see all this in action in a complete example—finally, something you can
actually run! As there are lots of bits and pieces involved, I’ve included the whole
source code this time rather than using snippets. There’s nothing mind-blowing in
the following listing, so don’t expect to be amazed—it’s just useful to have concrete
code to discuss.
Listing 2.1
Using delegates in a variety of simple ways
using System;
delegate void StringProcessor(string input);
class Person
{
string name;
public Person(string name) { this.name = name; }
Declares delegate type
B
4 For synchronous invocation, anyway. You can use BeginInvoke and EndInvoke to invoke a delegate
instance asynchronously, but that’s beyond the scope of this chapter.
5 Or any other kind of expression—but it’s usually a variable.


<!-- PDF page 65 -->

Core foundations: building on C# 1
public void Say(string message)
{
Console.WriteLine("{0} says: {1}", name, message);
}
}
class Background
{
public static void Note(string note)
{
Console.WriteLine("({0})", note);
}
}
class SimpleDelegateUse
{
static void Main()
{
Person jon = new Person("Jon");
Person tom = new Person("Tom");
StringProcessor jonsVoice, tomsVoice, background;
jonsVoice = new StringProcessor(jon.Say);
tomsVoice = new StringProcessor(tom.Say);
background = new StringProcessor(Background.Note);
jonsVoice("Hello, son.");
tomsVoice.Invoke("Hello, Daddy!");
background("An airplane flies past.");
}
}
Declares
compatible
instance
method
C
Declares compatible
static method
D
Creates three
delegate
instances
E
Invokes
delegate
instances
F
To start with, you declare the delegate type B. Next, you create two methods (C
and D) that are both compatible with the delegate type. You have one instance
method (Person.Say) and one static method (Background.Note), so you’ll see how
they’re used differently when you create the delegate instances E. Listing 2.1
includes two instances of the Person class, so you can see the difference that the tar-
get of a delegate makes.
When jonsVoice is invoked F, it calls the Say method on the Person object with
the name Jon; likewise, when tomsVoice is invoked, it uses the object with the name
Tom. This code includes both ways of invoking delegate instances that you’ve seen—
calling Invoke explicitly and using the C# shorthand—just for interest’s sake. Nor-
mally you’d use the shorthand.
The output of listing 2.1 is fairly obvious:
Jon says: Hello, son.
Tom says: Hello, Daddy!
(An airplane flies past.)
Frankly, there’s an awful lot of code in listing 2.1 to display three lines of output. Even
if you wanted to use the Person class and the Background class, there’s no real need to
use delegates here. So what’s the point? Why not just call the methods directly? The
answer lies in our original example of an attorney executing a will—just because you
want something to happen doesn’t mean you’re always there at the right time and


<!-- PDF page 66 -->

Delegates
place to make it happen. Sometimes you need to give instructions—to delegate respon-
sibility, as it were.
I should stress that back in the world of software, this isn’t a matter of objects leav-
ing dying wishes. Often the object that first creates a delegate instance is still alive and
well when the delegate instance is invoked. Instead, it’s about specifying some code to
be executed at a particular time, when you may not be able (or may not want) to
change the code that’s running at that point. If I want something to happen when a
button is clicked, I don’t want to have to change the code of the button—I just want to
tell the button to call one of my methods, which will take the appropriate action. It’s a
matter of adding a level of indirection, as so much of object-oriented programming is.
As you’ve seen, this adds complexity (look at how many lines of code it took to pro-
duce so little output!) but also flexibility.
Now that you understand more about simple delegates, we’ll take a brief look at
combining delegates together to execute a whole bunch of actions instead of just one.
2.1.2
Combining and removing delegates
So far, all the delegate instances we’ve looked at have had a single action. In reality,
life is a bit more complicated: a delegate instance actually has a list of actions associ-
ated with it called the invocation list. The static Combine and Remove methods of the
System.Delegate type are responsible for creating new delegate instances by respec-
tively splicing together the invocation lists of two delegate instances or removing the
invocation list of one delegate instance from another.
DELEGATES ARE IMMUTABLE
Once you’ve created a delegate instance, noth-
ing about it can be changed. This makes it safe to pass around references to
delegate instances and combine them with others without worrying about
consistency, thread safety, or anyone trying to change their actions. This is
like strings, which are also immutable, and Delegate.Combine is just like
String.Concat—they both combine existing instances together to form a
new one without changing the original
objects at all. In the case of delegate
instances, the original invocation lists are
concatenated together. Note that if you
ever try to combine null with a delegate
instance, the null is treated as if it were a
delegate instance with an empty invoca-
tion list.
required
parameter
optional
parameters
void Dump(int x, int y = 20, int z
You’ll rarely see an explicit call to Delegate
.Combine in C# code—usually the + and += opera-
tors are used. Figure 2.2 shows the translation
process, where x and y are both variables of the
same (or compatible) delegate types. All of this is
done by the C# compiler.
default
values
Figure 2.2
The transformation process
used for the C# shorthand syntax for
combining delegate instances


<!-- PDF page 67 -->

Core foundations: building on C# 1
As you can see, it’s a straightforward transformation, but it makes the code a lot
neater. Just as you can combine delegate instances, you can remove one from another
with the Delegate.Remove method, and C# uses the shorthand of the - and -= opera-
tors in the obvious way. Delegate.Remove(source, value) creates a new delegate
whose invocation list is the one from source, with the list from value having been
removed. If the result would have an empty invocation list, null is returned.
When a delegate instance is invoked, all its actions are executed in order. If the
delegate’s signature has a nonvoid return type, the value returned by Invoke is the
value returned by the last action executed. It’s rare to see a nonvoid delegate instance
with more than one action in its invocation list because it means the return values of
all the other actions are never seen unless the invoking code explicitly executes the
actions one at a time, using Delegate.GetInvocationList to fetch the list of actions.
If any of the actions in the invocation list throws an exception, that prevents any of
the subsequent actions from being executed. For example, if a delegate instance with
an invocation list [a, b, c] is invoked, and action b throws an exception, the excep-
tion will be propagated immediately and action c won’t be executed.
Combining and removing delegate instances is particularly useful when it comes to
events. Now that you understand what combining and removing involves, we can talk
about events.
2.1.3
A brief diversion into events
You probably have an instinctive idea about the overall point of events, particularly if
you’ve written any UIs. The idea is that an event allows code to react when something
happens—saving a file when the appropriate button is clicked, for example. In this
case, the event is the clicking of the button, and the action is the saving of the file.
Understanding the reason for the concept isn’t the same as understanding how C#
defines events in language terms, though.
Developers often confuse events and delegate instances, or events and fields
declared with delegate types. The difference is important: events aren’t fields. The rea-
son for the confusion is that C# provides a shorthand in the form of field-like events.
We’ll come to those in a minute, but first let’s consider what events consist of as far as
the C# compiler is concerned.
It’s helpful to think of events as being similar to properties. To start with, both of
them are declared to be of a certain type—an event is forced to be a delegate type.
When you use properties, it looks like you’re fetching or assigning values directly to
fields, but you’re actually calling methods (getters and setters). The property imple-
mentation can do what it likes within those methods—it just happens that most prop-
erties are implemented with simple fields backing them, sometimes with some
validation in the setter and sometimes with some thread safety thrown in for good
measure.
Likewise, when you subscribe to or unsubscribe from an event, it looks like you’re
using a field whose type is a delegate type, with the += and -= operators. Again,


<!-- PDF page 68 -->

Delegates
though, you’re actually calling methods (add and remove).6 That’s all you can do with
an event—subscribe to it (add an event handler) or unsubscribe from it (remove an
event handler). It’s up to the event methods to do something useful, such as taking
notice of the event handlers you’re trying to add and remove, and making them avail-
able elsewhere within the class.
The reason for having events in the first place is much like the reason for having
properties—they add a layer of encapsulation, implementing the publish/subscribe
pattern (see my article, “Delegates and Events,” here: http://mng.bz/HPx6). Just as
you don’t want other code to be able to set field values without the owner at least hav-
ing the option of validating the new value, you often don’t want code outside a class to
be able to arbitrarily change (or call) the handlers for an event. Of course, a class can
add methods to give extra access—for instance, to reset the list of handlers for an
event, or to raise the event (in other words, to call its event handlers). For example,
BackgroundWorker.OnProgressChanged just calls the ProgressChanged event han-
dlers. But if you only expose the event itself, code outside the class only has the ability
to add and remove handlers.
Field-like events make the implementation of all of this much simpler to look at—a
single declaration and you’re done. The compiler turns the declaration into both an
event with default add/remove implementations and a private field of the same type.
Code inside the class sees the field; code outside the class only sees the event. This
makes it look as if you can invoke an event, but what you actually do to call the event
handlers is invoke the delegate instance stored in the field.
The details of events are outside the scope of this chapter—events themselves
haven’t changed much in later versions of C#,7 but I wanted to draw attention to the
difference between delegate instances and events now, to prevent confusion later on.
2.1.4
Summary of delegates
Let’s summarize what we’ve covered on delegates:
Delegates encapsulate behavior with a particular return type and set of parame-
ters, similar to a single-method interface.
The type signature described by a delegate type declaration determines
which methods can be used to create delegate instances, and the signature
for invocation.
Creating a delegate instance requires a method and (for instance methods) a
target to call the method on.
Delegate instances are immutable.
Delegate instances each contain an invocation list—a list of actions.
6 These aren’t their names in the compiled code; otherwise you could only have one event per type. The com-
piler creates two methods with names that aren’t used elsewhere, and includes a special piece of metadata to
let other types know that there’s an event with the given name, and what its add/remove methods are called.
7 There are very small changes to field-like events in C# 4. See section 4.2 for details.


<!-- PDF page 69 -->

Core foundations: building on C# 1
Delegate instances can be combined with and removed from each other.
Events aren’t delegate instances—they’re just add/remove method pairs (think
property getters/setters).
Delegates are one specific feature of C# and .NET—a detail in the grand scheme of
things. Both of the other reminder sections in this chapter deal with much broader
topics. First, we’ll consider what it means to talk about C# being a statically typed lan-
guage and the implications that has.
2.2
Type system characteristics
Almost every programming language has a type system of some kind. Over time,
these have been classified as strong/weak, safe/unsafe, static/dynamic, and no doubt
some more esoteric variations. It’s obviously important to understand the type system
you’re working with, and it’s reasonable to expect that knowing the categories into
which a language falls would give you a lot of information on that front. But because
the terms are used by different people to mean somewhat different things, miscom-
munication is almost inevitable. I’ll try to explain exactly what I mean by each term to
minimize confusion.
One important thing to note is that this section is only applicable to safe code,
which means all C# code that isn’t explicitly within an unsafe context. As you might
judge from the name, code within an unsafe context can do various things that safe
code can’t, and that may violate some aspects of normal type safety, although the type
system is still safe in many other ways. Most developers are unlikely ever to need to
write unsafe code, and the characteristics of the type system are far simpler to describe
and understand when only safe code is considered.
This section shows what restrictions are and aren’t enforced in C# 1 while defining
some terms to describe that behavior. We’ll then look at a few things you can’t do with
C# 1—first from the point of view of what you can’t tell the compiler, and then from
the point of view of what you might wish you didn’t have to tell the compiler.
Let’s start off with what C# 1 does, and with the terminology that’s usually used to
describe that kind of behavior.
2.2.1
C#’s place in the world of type systems
It’s easiest to begin by making a statement and then clarifying what it means and what
the alternatives might be:
C# 1’s type system is static, explicit, and safe.
You might have expected the word strong to appear in the list, and I had half a mind to
include it. But although most people can reasonably agree on whether a language has
the characteristics I listed, deciding whether a language is strongly typed can cause
heated debate because the definitions vary so wildly. Some meanings (those prevent-
ing any conversions, explicit or implicit) would clearly rule C# out, whereas others are
quite close to (or even the same as) statically typed, which would include C# 1. Most of


<!-- PDF page 70 -->

Type system characteristics
the articles and books I’ve read that describe C# as a strongly typed language are effec-
tively using “strongly typed” to mean statically typed.
Let’s take the terms in the definition one at a time and shed some light on them.
STATIC TYPING VERSUS DYNAMIC TYPING
C# 1 is statically typed: each variable is of a particular type, and that type is known at
compile time.8 Only operations that are known for that type are allowed, and this is
enforced by the compiler. Consider this example of enforcement:
object o = "hello";
Console.WriteLine(o.Length);
As you look at the code, it’s obvious that the value of o refers to a string, and that the
string type has a Length property, but the compiler only thinks of o as being of type
object. If you want to get to the Length property, you have to tell the compiler that
the value of o refers to a string:
object o = "hello";
Console.WriteLine(((string)o).Length);
The compiler is then able to find the Length property of System.String. It uses this
to validate that the call is correct, emit the appropriate IL, and work out the type of
the larger expression. The compile-time type of an expression is also known as its
static type—so you might say, “The static type of o is System.Object.”
WHY IS IT CALLED STATIC TYPING?
The word static is used to describe this
kind of typing because the analysis of what operations are available is per-
formed using unchanging data: the compile-time types of expressions. Sup-
pose a variable is declared to be of type Stream; the type of the variable
doesn’t change even if the value of the variable varies from a reference to a
MemoryStream, a FileStream, or no stream at all (with a null reference).
Even within static type systems, there can be some dynamic behavior; the
actual implementation executed by a virtual method call will depend on the
value it’s called on. The idea of unchanging information is also the motiva-
tion behind the static modifier, but it’s generally simpler to think of a
static member as one belonging to the type itself rather than to any particu-
lar instance of the type. For most practical purposes, you can think of the
two uses of the word as unrelated.
The alternative to static typing is dynamic typing, which can take a variety of guises. The
essence of dynamic typing is that variables just have values—they aren’t restricted to
particular types, so the compiler can’t perform the same sort of checks. Instead, the
execution environment attempts to understand expressions in an appropriate manner
for the values involved. For example, if C# 1 were dynamically typed, you could do this:
8 This applies to most expressions too, but not quite all of them. Certain expressions don’t have a type, such as
void method invocations, but this doesn’t affect C# 1’s status of being statically typed. I’ve used the word vari-
able throughout this section to avoid unnecessary brain strain.


<!-- PDF page 71 -->

Core foundations: building on C# 1
![Figure from PDF page 71](images/page-071-figure-0039.png)

o = "hello";
Console.WriteLine(o.Length);
o = new string[] {"hi", "there"};
Console.WriteLine(o.Length);
![Figure from PDF page 71](images/page-071-figure-0040.png)

WHAT IF?
This would invoke two completely unrelated Length properties—String.Length and
Array.Length—by examining the types dynamically at execution time. Like many
aspects of type systems, there are different levels of dynamic typing. Some languages
allow you to specify types where you want to—possibly still treating them dynamically
apart from assignment—but let you use untyped variables elsewhere.
Although I’ve specified C# 1 repeatedly in this description, C# was entirely stati-
cally typed up to and including C# 3. You’ll see later that C# 4 introduced some
dynamic typing, although the vast majority of code in most C# 4 applications will still
use static typing.
EXPLICIT TYPING VERSUS IMPLICIT TYPING
The distinction between explicit typing and implicit typing is only relevant in statically
typed languages. With explicit typing, the type of every variable must be explicitly
stated in the declaration. Implicit typing allows the compiler to infer the type of the
variable based on its use. For example, the language could dictate that the type of the
variable is the type of the expression used to assign the initial value.
Consider a hypothetical language that uses the keyword var to indicate type infer-
ence.9 Table 2.1 shows how code in such a language could be written in C# 1. The
code in the left column is not allowed in C# 1, but the code in the right column is the
equivalent valid code.
Table 2.1
An example showing the differences between implicit and explicit typing
Invalid C# 1—implicit typing
Valid C# 1—explicit typing
var s = "hello";
string s = "hello";
var x = s.Length;
int x = s.Length;
var twiceX = x * 2;
int twiceX = x * 2;
Hopefully it’s clear why this is only relevant for statically typed situations: for both
implicit and explicit typing, the type of the variable is known at compile time, even if
it’s not explicitly stated. In a dynamic context, the variable doesn’t even have a
compile-time type to state or infer.
TYPE-SAFE VERSUS TYPE-UNSAFE
The easiest way of describing a type-safe system is to describe its opposite. Some lan-
guages (I’m thinking particularly of C and C++) allow you to do some really devious
things. They’re potentially powerful in the right situations, but with great power
comes a free box of donuts, or however the expression goes, and the right situations
9 Okay, not so hypothetical. See section 8.2 for C# 3’s implicitly typed local variable capabilities.


<!-- PDF page 72 -->

Type system characteristics
are relatively rare. Some of these devious things can shoot you in the foot if you get
them wrong. Abusing the type system is one of them.
With the right voodoo rituals, you can persuade these languages to treat a value of
one type as if it were a value of a completely different type without applying any conver-
sions. I don’t just mean calling a method that happens to have the same name, as in
the dynamic typing example earlier. I mean code that looks at the raw bytes within a
value and interprets them in the “wrong” way. The following listing gives a simple C
example of what I mean.
Listing 2.2
Demonstrating a type-unsafe system with C code
#include <stdio.h>
int main(int argc, char**argv)
{
char *first_arg = argv[1];
int *first_arg_as_int = (int *)first_arg;
printf ("%d", *first_arg_as_int);
}
If you compile listing 2.2 and run it with a simple argument of "hello", you’ll see a
value of 1819043176—at least on a little-endian architecture with a compiler treating
int as 32 bits and char as 8 bits, and where text is represented in ASCII or UTF-8. The
code is treating the char pointer as an int pointer, so dereferencing it returns the first
4 bytes of text, treating them as a number.
In fact, this tiny example is tame compared with other potential abuses—casting
between completely unrelated structs can easily result in total mayhem. It’s not that
this happens in real life very often, but some elements of the C typing system often
require you to tell the compiler what to do, leaving it no option but to trust you even
at execution time.
Fortunately, none of this occurs in C#. Yes, there are plenty of conversions avail-
able, but you can’t pretend that data for one particular type of object is actually data
for a different type. You can try by adding a cast to give the compiler this extra (and
incorrect) information, but if the compiler spots that it’s actually impossible for that
cast to work, it’ll trigger a compilation error—and if it’s theoretically allowed but actu-
ally incorrect at execution time, the CLR will throw an exception.
Now that you know a little about how C# 1 fits into the bigger picture of type sys-
tems, I’d like to mention a few downsides of its choices. That’s not to say the choices
are wrong—they’re just limiting in some ways. Often language designers have to
choose between different paths that add different limitations or have other undesir-
able consequences. I’ll start with the case where you want to give the compiler more
information, but there’s no way of doing so.
2.2.2
When is C# 1’s type system not rich enough?
There are two common situations where you might want to expose more information
to the caller of a method, or perhaps force the caller to limit what it provides in its


<!-- PDF page 73 -->

Core foundations: building on C# 1
arguments. The first involves collections, and the second involves inheritance and
overriding methods or implementing interfaces. We’ll examine each in turn.
COLLECTIONS, STRONG AND WEAK
Having avoided the terms strong and weak for the C# type system in general, I’ll use
them when talking about collections. The terms are used almost everywhere in this
context, with little room for ambiguity. Broadly speaking, three kinds of collection
types are built into .NET 1.1:
Arrays—strongly typed—in both the language and the runtime
Weakly typed collections in the System.Collections namespace
Strongly typed collections in the System.Collections.Specialized
namespace
Arrays are strongly typed,10 so at compile time you can’t set an element of a string[]
to be a FileStream, for instance. But reference type arrays also support covariance,
which provides an implicit conversion from one type of array to another, as long as
there’s a conversion between the element types. Checks occur at execution time to
make sure that the wrong type of reference isn’t being stored, as shown in the follow-
ing listing.
Listing 2.3
Demonstration of array covariance and execution-time checking
Applies covariant conversion
B
string[] strings = new string[5];
object[] objects = strings;
objects[0] = new Button();
Attempts to store a Button
C
If you run listing 2.3, you’ll see that an ArrayTypeMismatchException is thrown C.
This is because the conversion from string[] to object[] B returns the original ref-
erence—both strings and objects refer to the same array. The array itself knows it’s
a string array and will reject attempts to store references to nonstrings. Array covari-
ance is occasionally useful, but it comes at the cost of implementing some of the type
safety at execution time instead of compile time.
Let’s compare this with the situation that weakly typed collections, such as Array-
List and Hashtable, put you in. The API of these collections uses object as the type
of keys and values. When you write a method that takes an ArrayList, for example,
there’s no way of making sure at compile time that the caller will pass in a list of
strings. You can document it, and the type safety of the runtime will enforce it if you
cast each element of the list to string, but you don’t get compile-time type safety.
Likewise, if you return an ArrayList, you can indicate in the documentation that it’ll
just contain strings, but callers will have to trust that you’re telling the truth, and
they’ll have to insert casts when they access the elements of the list.
10 At least, the language allows them to be. You can use the Array type for weakly typed access to arrays, though.


<!-- PDF page 74 -->

Type system characteristics
Finally, consider strongly typed collections, such as StringCollection. These pro-
vide a strongly typed API, so you can be confident that when you receive a String-
Collection as a parameter or return value, it’ll only contain strings, and you don’t
need to cast when fetching elements of the collection. It sounds ideal, but there are
two problems. First, it implements IList, so you can still try to add nonstrings to it
(although you’ll fail at execution time). Second, it only deals with strings. There are
other specialized collections, but all told they don’t cover much ground. There’s the
CollectionBase type, which can be used to build your own strongly typed collec-
tions, but that means creating a new collection type for each element type, which is
also not ideal.
Now that you’ve seen the problem with collections, let’s consider the issue that can
occur when you’re overriding methods and implementing interfaces. It’s related to
the idea of covariance, which we’ve already seen with arrays.
LACK OF COVARIANT RETURN TYPES
ICloneable is one of the simplest interfaces in the framework. It has a single method,
Clone, which should return a copy of the object that the method is called on. Now,
leaving aside the issue of whether this should be a deep or shallow copy, let’s look at
the signature of the Clone method:
object Clone()
It’s a straightforward signature, certainly—but as I said, the method should return
a copy of the object it’s called on. That means it needs to return an object of the
same type, or at least a compatible one (where that meaning will vary depending on
the type).
It would make sense to be able to override the method with a signature that gives a
more accurate description of what the method actually returns. For example, in a
Person class it’d be nice to be able to implement ICloneable with
public Person Clone()
That wouldn’t break anything—code expecting any old object would still work fine.
This feature is called return type covariance but, unfortunately, interface implementa-
tion and method overriding don’t support it. Instead, the normal workaround for
interfaces is to use explicit interface implementation to achieve the desired effect:
public Person Clone()
{
[Implementation goes here]
}
object ICloneable.Clone()
{
return Clone();
}
Implements interface explicitly
Calls noninterface method
Any code that calls Clone() on an expression with a static type of Person will call the
top method; if the type of the expression is ICloneable, it’ll call the bottom method.
This works, but it’s really ugly. The mirror image of this situation also occurs with


<!-- PDF page 75 -->

Core foundations: building on C# 1
parameters, where if you had an interface or virtual method with a signature of, say,
void Process(string x), it’d seem logical to be able to implement or override the
method with a less demanding signature, such as void Process(object x). This is
called parameter type contravariance; it’s just as unsupported as return type covariance,
and you have to use the same workaround for interfaces and normal overloading for
virtual methods. It’s not a showstopper, but it’s irritating.
Of course, C# 1 developers put up with all of these issues for a long time, and Java
developers had a similar situation for far longer. Although compile-time type safety is
a great feature in general, I can’t remember seeing many bugs where people actually
put the wrong type of element in a collection. I can live with the workaround for the
lack of covariance and contravariance. But there’s such a thing as elegance and mak-
ing your code clearly express what you mean, preferably without needing explanatory
comments. Even if bugs don’t strike, enforcing the documented contract that a collec-
tion must only contain strings (for example) can be expensive and fragile in the face
of mutable collections. This is the sort of contract you really want the type system itself
to enforce.
You’ll see later that C# 2 isn’t flawless either, but it makes large improvements.
There are more changes in C# 4, but even so, return type covariance and parameter
contravariance are missing.11
2.2.3
Summary of type system characteristics
In this section, you’ve learned some of the differences between type systems, and in
particular which characteristics apply to C# 1:
C# 1 is statically typed—the compiler knows what members to let you use.
C# 1 is explicit—you have to state the type of every variable.
C# 1 is safe—you can’t treat one type as if it were another unless there’s a genu-
ine conversion available.
Static typing doesn’t allow a single collection to be a strongly typed list of strings
or list of integers without a lot of code duplication for different element types.
Method overriding and interface implementation don’t allow covariance or
contravariance.
The next section covers one of the most fundamental aspects of C#’s type system
beyond its high-level characteristics—the differences between structs and classes.
2.3
Value types and reference types
It would be hard to overstate how important the subject of this section is. Everything
you do in .NET will deal with either a value type or a reference type, and yet it’s curi-
ously possible to develop for a long time with only a vague idea of what the difference
is. Worse yet, there are plenty of myths to confuse things further. The unfortunate fact
is that it’s easy to make a short but incorrect statement that’s close enough to the truth
11 C# 4 introduced limited generic covariance and contravariance, but that’s not quite the same thing.


<!-- PDF page 76 -->

Value types and reference types
to be plausible but inaccurate enough to be misleading—but it’s relatively tricky to
come up with a concise but accurate description.
This section isn’t a complete breakdown of how types are handled, marshaling
between application domains, interoperability with native code, and the like. Instead,
it’s a brief look at the absolute basics of the topic (as applied to C# 1) that are crucial
in order to come to grips with later versions of C#.
We’ll start off by seeing how the fundamental differences between value types and
reference types appear naturally in the real world, as well as in .NET.
2.3.1
Values and references in the real world
Suppose you’re reading something fantastic, and you want a friend to read it too. Let’s
further suppose that it’s a document in the public domain, just to avoid any accusa-
tions of supporting copyright violation. What do you need to give your friend so that
he can read it too? It depends entirely on what you’re reading.
First we’ll deal with the case where you have real paper in your hands. To give your
friend a copy, you’d need to photocopy all the pages and then give it to him. At that
point, he has his own complete copy of the document. In this situation, you’re dealing
with value type behavior. All the information is directly in your hands—you don’t need
to go anywhere else to get it. Your copy of the information is also independent of your
friend’s after you’ve made the copy. You could add some notes to your pages, and his
pages wouldn’t be changed at all.
Compare that with the situation where you’re reading a web page. This time, all
you have to give your friend is the URL of the web page. This is reference type behavior,
with the URL taking the place of the reference. In order to read the document, you
have to navigate the reference by putting the URL in your browser and asking it to
load the page. If the web page changes for some reason (imagine it’s a wiki page and
you’ve added your notes to the page), both you and your friend will see that change
the next time each of you loads the page.
These differences in the real world illustrate the heart of the distinction between
value types and reference types in C# and .NET. Most types in .NET are reference types,
and you’re likely to create far more reference than value types. The most common
cases are classes (declared using class), which are reference types, and structures
(declared using struct), which are value types. The other situations are as follows:
Array types are reference types, even if the element type is a value type (so
int[] is still a reference type, even though int is a value type).
Enumerations (declared using enum) are value types.
Delegate types (declared using delegate) are reference types.
Interface types (declared using interface) are reference types, but they can be
implemented by value types.
Now that you have a basic idea of what reference types and value types are about, we’ll
look at a few of the most important details.


<!-- PDF page 77 -->

Core foundations: building on C# 1
2.3.2
Value and reference type fundamentals
The key concept to grasp when it comes to value types and reference types is what the
value of a particular expression is. To keep things concrete, I’ll use variables as the
most common examples of expressions, but the same thing applies to properties,
method calls, indexers, and other expressions.
As we discussed in section 2.2.1, most expressions have a static type associated with
them. The value of a value type expression is the value, plain and simple. For instance,
the value of the expression "2 + 3" is 5. The value of a reference type expression, though,
is a reference—it’s not the object that the reference refers to. The value of the expres-
sion String.Empty is not an empty string—it’s a reference to an empty string. In every-
day discussions and even in documentation, we tend to blur this distinction. For
instance, I might describe String.Concat as returning “a string that’s the concatena-
tion of all the parameters.” Using precise terminology here would be time consuming
and distracting, and there’s no problem as long as everyone involved understands that
only a reference is returned.
To demonstrate this further, consider a Point type that stores two integers, x and y.
It could have a constructor that takes the two values. This type could be implemented
as either a struct or a class. Figure 2.3 shows the result of executing the following lines
of code:
Point p1 = new Point(10, 20);
Point p2 = p1;
The left side of figure 2.3 indicates the values involved when Point is a class (a refer-
ence type), and the right side shows the situation when Point is a struct (a value type).
In both cases, p1 and p2 have the same value after the assignment. But in the case
where Point is a reference type, that value is a reference: both p1 and p2 refer to the
same object. When Point is a value type, the value of p1 is the whole of the data for a
point—the x and y values. Assigning the value of p1 to p2 copies all of that data.
The values of variables are stored wherever they’re declared. Local variable values
are always stored on the stack,12 and instance variable values are always stored
p1
y
x
p1
ref
x
y
p2
p2
y
x
ref
Figure 2.3
Comparing value type and
reference type behaviors, particularly with
regard to assignment
When Point is a
reference type
When Point is
a value type
12 This is only totally true for C# 1. You’ll see later that local variables can end up on the heap in certain situa-
tions in later versions.


<!-- PDF page 78 -->

Value types and reference types
wherever the instance itself is stored. Reference type instances (objects) are always
stored on the heap, as are static variables.
Another difference between the two kinds of type is that value types can’t be
derived from. One consequence of this is that the value doesn’t need any extra infor-
mation about what type that value actually is. Compare that with reference types,
where each object contains a block of data at the start identifying the type of the
object, along with some other information. You can never change the type of an
object—when you perform a simple cast, the runtime just takes a reference, checks
whether the object it refers to is a valid object of the desired type, and returns the ref-
erence if it’s valid or throws an exception otherwise. The reference itself doesn’t know
the type of the object, so the same reference value can be used for multiple variables
of different types. For instance, consider the following code:
Stream stream = new MemoryStream();
MemoryStream memoryStream = (MemoryStream) stream;
The first line creates a new MemoryStream object and sets the value of the stream
variable to be a reference to that new object. The second line checks whether the
value of stream refers to a MemoryStream (or derived type) object and sets the value of
memoryStream to be the same as stream.
Once you understand these basic points, you can apply them when thinking about
some of the falsehoods that are often stated about value types and reference types.
2.3.3
Dispelling myths
Various myths do the rounds on a regular basis. I’m sure the misinformation is almost
always passed on with no malice and with no idea of the inaccuracies involved, but it’s
unhelpful nonetheless. In this section, I’ll tackle the most prominent myths, explain-
ing the true situation as I go.
MYTH #1: STRUCTS ARE LIGHTWEIGHT CLASSES
This myth comes in a variety of forms. Some people believe that value types can’t or
shouldn’t have methods or other significant behavior—they should be used as simple
data transfer types, with just public fields or simple properties. The DateTime type is a
good counterexample to this: it makes sense for it to be a value type, in terms of being
a fundamental unit like a number or a character, and it also makes sense for it to be
able to perform calculations based on its value. Looking at things from the other
direction, data transfer types should often be reference types anyway—the decision
should be based on the desired value or reference type semantics, not the simplicity of
the type.
Other people believe that value types are “lighter” than reference types in terms
of performance. The truth is that in some cases value types are more performant—
they don’t require garbage collection unless they’re boxed, don’t have the type
identification overhead, and don’t require dereferencing, for example. But in other
ways, reference types are more performant—parameter passing, assigning values to
variables, returning values, and similar operations only require 4 or 8 bytes to be


<!-- PDF page 79 -->

Core foundations: building on C# 1
copied (depending on whether you’re running the 32-bit or 64-bit CLR) rather than
copying all the data. Imagine if ArrayList were somehow a “pure” value type, and
passing an ArrayList expression to a method involved copying all its data! In almost
all cases, performance isn’t really determined by this sort of decision anyway. Bottle-
necks are almost never where you think they’ll be, and before you make a design deci-
sion based on performance, you should measure the different options.
It’s worth noting that the combination of the two beliefs doesn’t work either. It
doesn’t matter how many methods a type has (whether it’s a class or a struct)—the
memory taken per instance isn’t affected. (There’s a cost in terms of the memory
taken up for the code itself, but that’s incurred once rather than for each instance.)
MYTH #2: REFERENCE TYPES LIVE ON THE HEAP; VALUE TYPES LIVE ON THE STACK
This one is often caused by laziness on the part of the person repeating it. The first
part is correct—an instance of a reference type is always created on the heap. It’s the
second part that causes problems. As I’ve already noted, a variable’s value lives wher-
ever it’s declared, so if you have a class with an instance variable of type int, that vari-
able’s value for any given object will always be where the rest of the data for the object
is—on the heap. Only local variables (variables declared within methods) and method
parameters live on the stack. In C# 2 and later, even some local variables don’t really
live on the stack, as you’ll see when we look at anonymous methods in chapter 5.
ARE THESE CONCEPTS RELEVANT NOW?
It’s arguable that if you’re writing man-
aged code, you should let the runtime worry about how memory is best used.
Indeed, the language specification makes no guarantees about what lives
where; a future runtime may be able to create some objects on the stack if it
knows it can get away with it, or the C# compiler could generate code that
hardly uses the stack at all.
The next myth is usually just a terminology issue.
MYTH #3: OBJECTS ARE PASSED BY REFERENCE IN C# BY DEFAULT
This is probably the most widely propagated myth. Again, the people who make this
claim often (though not always) know how C# actually behaves, but they don’t know
what “pass by reference” really means. Unfortunately, this is confusing for people who
do know what it means.
The formal definition of pass by reference is relatively complicated, involving l-values
and similar computer-science terminology, but the important thing is that if you pass a
variable by reference, the method you’re calling can change the value of the caller’s vari-
able by changing its parameter value. Now, remember that the value of a reference
type variable is the reference, not the object itself. You can change the contents of the
object that a parameter refers to without the parameter itself being passed by refer-
ence. For instance, the following method changes the contents of the StringBuilder
object in question, but the caller’s expression will still refer to the same object as
before:


<!-- PDF page 80 -->

Value types and reference types
void AppendHello(StringBuilder builder)
{
builder.Append("hello");
}
When this method is called, the parameter value (a reference to a StringBuilder) is
passed by value. If you were to change the value of the builder variable within the
method—for example, with the statement builder = null;—that change wouldn’t be
seen by the caller, contrary to the myth.
It’s interesting to note that not only is the “by reference” bit of the myth inaccu-
rate, but so is the “objects are passed” bit. Objects themselves are never passed, either
by reference or by value. When a reference type is involved, either the variable is
passed by reference or the value of the argument (the reference) is passed by value.
Aside from anything else, this answers the question of what happens when null is
used as a by-value argument—if objects were being passed around, that would cause
issues, as there wouldn’t be an object to pass! Instead, the null reference is passed by
value in the same way as any other reference would be.
If this quick explanation has left you bewildered, you might want to look at my arti-
cle, “Parameter passing in C#,” (http://mng.bz/otVt), which goes into much more
detail.
These myths aren’t the only ones around. Boxing and unboxing come in for their
fair share of misunderstanding, which I’ll try to clear up next.
2.3.4
Boxing and unboxing
Sometimes, you just don’t want a value type value. You want a reference. There are var-
ious reasons why this can happen, and fortunately C# and .NET provide a mechanism
called boxing that lets you create an object from a value type value and use a reference
to that new object. Before we leap into an example, let’s start off by reviewing two
important facts:
The value of a reference type variable is always a reference.
The value of a value type variable is always a value of that type.
Given those two facts, the following three lines of code don’t seem to make much
sense at first glance:
int i = 5;
object o = i;
int j = (int) o;
You have two variables: i is a value type variable, and o is a reference type variable.
How does it make sense to assign the value of i to o? The value of o has to be a refer-
ence, and the number 5 isn’t a reference—it’s an integer value. What’s actually hap-
pening is boxing: the runtime creates an object (on the heap—it’s a normal object)
that contains the value (5). The value of o is then a reference to that new object. The
value in the object is a copy of the original value—changing the value of i won’t
change the value in the box at all.


<!-- PDF page 81 -->

Core foundations: building on C# 1
The third line performs the reverse operation—unboxing. You have to tell the com-
piler which type to unbox the object as, and if you use the wrong type (if it’s a boxed
uint or long, for example, or not a boxed value at all), an InvalidCastException is
thrown. Again, unboxing copies the value that was in the box; after the assignment,
there’s no further association between j and the object.
That’s boxing and unboxing in a nutshell. The only remaining problem is knowing
when boxing and unboxing occur. Unboxing is usually obvious, because the cast is pres-
ent in the code. Boxing can be more subtle. You’ve seen the simple version, but it can
also occur if you call the ToString, Equals, or GetHashCode methods on the value of a
type that doesn’t override them,13 or if you use the value as an interface expression—
assigning it to a variable whose type is an interface type or passing it as the value for a
parameter with an interface type. For example, the statement IComparable x = 5;
would box the number 5.
It’s worth being aware of boxing and unboxing because of the potential perfor-
mance penalty involved. A single box or unbox operation is cheap, but if you perform
hundreds of thousands of them, you not only have the cost of the operations, but
you’re also creating a lot of objects, which gives the garbage collector more work to do.
This performance hit isn’t usually an issue, but it’s worth being aware of so you can
measure the effect if you’re concerned.
2.3.5
Summary of value types and reference types
In this section, we’ve looked at the differences between value types and reference
types and at some of the myths surrounding them. Here are the key points:
The value of a reference type expression (a variable, for example) is a refer-
ence, not an object.
References are like URLs—they’re small pieces of data that let you access the
real information.
The value of a value type expression is the actual data.
There are times when value types are more efficient than reference types, and
vice versa.
Reference type objects are always on the heap, but value type values can be on
either the stack or the heap, depending on context.
When a reference type is used as a method parameter, by default the argument
is passed by value, but the value itself is a reference.
Value type values are boxed when reference type behavior is needed; unboxing
is the reverse process.
Now that we’ve had a look at all the bits of C# 1 that you need to be comfortable with,
it’s time to take a quick look forward and see where each of the features are enhanced
by the later versions of C#.
13 Boxing will always occur when you call GetType() on a value type variable, because it can’t be overridden.
You should already know the exact type if you’re dealing with the unboxed form, so you can just use typeof
instead.


<!-- PDF page 82 -->

Beyond C# 1: new features on a solid base
2.4
Beyond C# 1: new features on a solid base
The three topics covered in this chapter are vital to all versions of C#. Almost all the
new features relate to at least one of them, and they change the balance of how the
language is used. Before we wrap up the chapter, let’s explore how the new features
relate to the old ones. I won’t give many details (for some reason the publisher didn’t
want a 600-page section), but it’s helpful to have an idea of where we’re going before
we get to the nitty-gritty. We’ll look at them in the same order as we covered them ear-
lier, starting with delegates.
2.4.1
Features related to delegates
Delegates of all kinds get a boost in C# 2, and then they’re given even more special
treatment in C# 3. Most of the features aren’t new to the CLR but are clever compiler
tricks to make delegates work more smoothly within the language. The changes affect
not just the syntax you can use, but the appearance and feeling of idiomatic C# code.
Over time, C# is gaining a more functional approach.
C# 1 has pretty clumsy syntax when it comes to creating a delegate instance. For
one thing, even if you need to accomplish something straightforward, you have to
write a whole separate method to create a delegate instance for it. C# 2 fixed this with
anonymous methods and introduced a simpler syntax for the cases where you still
want to use a normal method to provide the action for the delegate. You can also cre-
ate delegate instances using methods with compatible signatures—the method signa-
ture no longer has to be exactly the same as the delegate’s declaration.
The following listing demonstrates all these improvements.
Listing 2.4
Improvements in delegate instantiation brought in by C# 2
static void HandleDemoEvent(object sender, EventArgs e)
{
Console.WriteLine ("Handled by HandleDemoEvent");
}
...
EventHandler handler;
handler = new EventHandler(HandleDemoEvent);
handler(null, EventArgs.Empty);
Specifies delegate
type and method
B
handler = HandleDemoEvent;
handler(null, EventArgs.Empty);
Implicitly converts
to delegate instance
C
handler = delegate(object sender, EventArgs e)
{
Console.WriteLine ("Handled anonymously");
};
handler(null, EventArgs.Empty);
Specifies action with
anonymous method
D
handler = delegate
{
Console.WriteLine ("Handled anonymously again");
};
handler(null, EventArgs.Empty);
Uses anonymous
method shortcut
E


<!-- PDF page 83 -->

Core foundations: building on C# 1
Uses delegate
contravariance
F
MouseEventHandler mouseHandler = HandleDemoEvent;
mouseHandler(null, new MouseEventArgs(MouseButtons.None,
0, 0, 0, 0));
The first part of the main code B is just C# 1 code, kept for comparison. The
remaining delegates all use new features of C# 2. Method group conversions C make
event subscription code read a lot more pleasantly—lines such as saveButton.Click
+= SaveDocument; are straightforward, with no extra fluff to distract the eye. The
anonymous method syntax D is a little cumbersome, but it does allow the action to
be clear at the point of creation, rather than being another method to look at before
you understand what’s going on. A shortcut is available when using anonymous meth-
ods E, but this form can only be used when you don’t need the parameters. Anony-
mous methods have other powerful features as well, but we’ll see those later.
The final delegate instance created F is an instance of MouseEventHandler rather
than just EventHandler, but the HandleDemoEvent method can still be used due to con-
travariance, which specifies parameter compatibility. Covariance specifies return type
compatibility. We’ll look at both of these in more detail in chapter 5. Event handlers
are probably the biggest beneficiaries of this, because suddenly the Microsoft guide-
line to make all delegate types used in events follow the same convention makes a lot
more sense. In C# 1, it didn’t matter whether two different event handlers looked
quite similar—you had to have a method with an exactly matching signature in order
to create a delegate instance. In C# 2, you may find yourself able to use the same
method to handle many different kinds of events, particularly if the purpose of the
method is fairly event independent, such as logging.
C# 3 provides special syntax for instantiating delegate types, using lambda expres-
sions. To demonstrate these, we’ll use a new delegate type. When the CLR gained
generics in .NET 2.0, generic delegate types became available and were used in a num-
ber of API calls in generic collections. .NET 3.5 takes things a step further, introducing
a group of generic delegate types called Func that all take parameters of specified
types and return a value of another specified type. The following listing shows the use
of a Func delegate type as well as lambda expressions.
Listing 2.5
Lambda expressions—like improved anonymous methods
Func<int,int,string> func = (x, y) => (x * y).ToString();
Console.WriteLine(func(5, 20));
Func<int,int,string> is a delegate type that takes two integers and returns a string.
The lambda expression in listing 2.5 specifies that the delegate instance (held in
func) should multiply the two integers together and call ToString(). The syntax is
much more straightforward than that of anonymous methods, and there are other
benefits in terms of the amount of type inference the compiler is prepared to perform
for you. Lambda expressions are absolutely crucial to LINQ, and you should get ready
to make them a core part of your language toolkit. They’re not restricted to working


<!-- PDF page 84 -->

Beyond C# 1: new features on a solid base
with LINQ, though—any use of anonymous methods from C# 2 can use lambda
expressions in C# 3, and that will almost always lead to shorter code.
To summarize, the new features related to delegates are as follows:
Generics (generic delegate types)—C# 2
Delegate instance creation expressions—C# 2
Anonymous methods—C# 2
Delegate covariance/contravariance—C# 2
Lambda expression—C# 3
Additionally, C# 4 allows generic covariance and contravariance for delegates, which
goes beyond what you’ve just seen. Indeed, generics form one of the principal
enhancements to the type system, which we’ll look at next.
2.4.2
Features related to the type system
The primary new feature in C# 2 regarding the type system is the inclusion of gener-
ics. It largely addresses the issues I raised in section 2.2.2 about strongly typed collec-
tions, although generic types are useful in a number of other situations too. As a
feature, it’s elegant, it solves a real problem, and despite a few wrinkles it generally
works well. You’ve seen examples of this in quite a few places already, and it’s
described fully in the next chapter, so I won’t go into any more detail here. Generics
form probably the most important feature in C# 2 with respect to the type system, and
you’ll see generic types throughout the rest of the book.
C# 2 doesn’t tackle the issues of return type covariance and parameter contravari-
ance for overriding members or implementing interfaces. But it does improve the situ-
ation for creating delegate instances in certain situations, as you saw in section 2.4.1.
C# 3 introduced a wealth of new concepts in the type system, most notably anony-
mous types, implicitly typed local variables, and extension methods. Anonymous types them-
selves are mostly present for the sake of LINQ, where it’s useful to be able to effectively
create a data transfer type with a bunch of read-only properties without having to actu-
ally write the code for them. There’s nothing to stop them from being used outside
LINQ, though, which makes life easier for demonstrations. Listing 2.6 shows both fea-
tures in action.
Listing 2.6
Demonstration of anonymous types and implicit typing
var jon = new { Name = "Jon", Age = 31 };
var tom = new { Name = "Tom", Age = 4 };
Console.WriteLine ("{0} is {1}", jon.Name, jon.Age);
Console.WriteLine ("{0} is {1}", tom.Name, tom.Age);
The first two lines each show implicit typing (the use of var) and anonymous object
initializers (the new {...} bit), which create instances of anonymous types.
There are two things worth noting at this stage, long before we get into the
details—points that have caused people to worry needlessly before. The first is that C#
3 is still statically typed. The C# compiler has declared jon and tom to be of a particular


<!-- PDF page 85 -->

Core foundations: building on C# 1
type, just as normal, and when you use the properties of the objects, they’re normal
properties—no dynamic lookup is going on. It’s just that you (as a source code author)
can’t tell the compiler what type to use in the variable declaration because the com-
piler will be generating the type itself. The properties are also statically typed—here
the Age property is of type int, and the Name property is of type string.
The second point is that we haven’t created two different anonymous types here.
The variables jon and tom both have the same type because the compiler uses the prop-
erty names, types, and order to work out that it can generate just one type and use it for
both statements. This is done on a per-assembly basis, and makes life a lot simpler in
terms of being able to assign the value of one variable to another (for example, jon =
tom; would be permitted in the previous code) and similar operations.
Extension methods are also there for the sake of LINQ but can be useful outside it.
Think of all the times you’ve wished that a framework type had a certain method, and
you’ve had to write a static utility method to implement it. For instance, to create a
new string by reversing an existing one, you might write a static StringUtil.Reverse
method. Well, the extension method feature effectively lets you call that static method
as if it existed on the string type itself, so you could write
string x = "dlrow olleH".Reverse();
Extension methods also let you appear to add methods with implementations to
interfaces, and LINQ relies on this heavily, allowing calls to all kinds of methods on
IEnumerable<T> that have never previously existed.
C# 4 has two features related to the type system. A relatively minor feature is cova-
riance and contravariance for generic delegates and interfaces. This has been present
in the CLR since .NET 2.0 came out, but only with the introduction of C# 4 and
updates to the generic types in the Base Class Library (BCL) has it become usable for
C# developers. A far bigger feature—although one many coders may never need—is
dynamic typing in C#.
Remember the introduction I gave to static typing, where I tried to use the Length
property of an array and a string via the same variable? Well, in C# 4 it works—when
you want it to. The following listing shows the same code except for the variable decla-
ration, but working as valid C# 4 code.
Listing 2.7
Dynamic typing in C# 4
dynamic o = "hello";
Console.WriteLine(o.Length);
o = new string[] {"hi", "there"};
Console.WriteLine(o.Length);
By declaring the variable o as having a static type of dynamic (yes, you read that right),
the compiler handles almost everything to do with o differently, leaving all the bind-
ing decisions (such as what Length means) until execution time.
Obviously we’re going to look at dynamic typing in greater depth, but I want to
stress now that C# 4 is still a statically typed language for the most part. Unless you’re


<!-- PDF page 86 -->

Beyond C# 1: new features on a solid base
using the dynamic type (which acts as a static type denoting a dynamic value), every-
thing works exactly the same way as before. Most C# developers will only rarely need
dynamic typing, and for the rest of the time they can ignore it. When dynamic typing
is handy, it can be really slick—and it lets you play nicely with code written in dynamic
languages running on the Dynamic Language Runtime (DLR). I’d just advise you not to
start using C# as a primarily dynamic language. If that’s what you want, use Iron-
Python or something similar; languages that are designed to support dynamic typing
from the ground up are likely to have fewer unexpected gotchas.
Here’s the quick-view list of these features, along with which version of C# they’re
introduced in:
Generics—C# 2
Limited delegate covariance/contravariance—C# 2
Anonymous types—C# 3
Implicit typing—C# 3
Extension methods—C# 3
Limited generic covariance/contravariance—C# 4
Dynamic typing—C# 4
After that fairly diverse set of features on the type system, let’s look at the features
added to one specific part of typing in .NET—value types.
2.4.3
Features related to value types
There are only two features to talk about here, both introduced in C# 2. The first goes
back to generics yet again, and in particular to collections. One common complaint
about using value types in collections with .NET 1.1 was that due to all of the general-
purpose APIs being specified in terms of the object type, every operation that added a
struct value to a collection would involve boxing it, and you’d have to unbox it when
retrieving it. While boxing is pretty cheap for an individual call, it can cause a signifi-
cant performance hit if it’s used every time with frequently accessed collections. It also
takes more memory than it needs to, due to the per-object overhead. Generics fix
both the speed and memory deficiencies by using the real type involved rather than a
general-purpose object. For example, it would’ve been madness to read a file and
store each byte as an element in an ArrayList in .NET 1.1, but in .NET 2.0 it wouldn’t
be crazy to do the same with a List<byte>.
The second feature addresses another common cause of complaint, particularly
when talking to databases—the fact that you can’t assign null to a value type variable.
There’s no such concept as an int value of null, for instance, even though a database
integer field may well be nullable. That makes it hard to model the database table
within a statically typed class without ugliness of some form or another. Nullable types
are part of .NET 2.0, and C# 2 includes extra syntax to make them easy to use. The fol-
lowing listing gives a brief example of this.


<!-- PDF page 87 -->

Core foundations: building on C# 1
Listing 2.8
Demonstration of a variety of nullable type features
int? x = null;
x = 5;
if (x != null)
{
int y = x.Value;
Console.WriteLine (y);
}
int z = x ?? 10;
Declares, sets nullable variable
Tests for presence of real value
Obtains real value
Uses null-coalescing operator
Listing 2.8 shows a number of the features of nullable types and the shorthand that C#
provides for working with them. We’ll get around to the details of each feature in
than any of the workarounds used in the past.
The list of enhancements is smaller this time, but they’re important features in
terms of both performance and elegance of expression:
Generics—C# 2
Nullable types—C# 2
2.5
Summary
This chapter has mostly been a revision exercise for C# 1. The aim wasn’t to cover any
one topic in its entirety, but merely to get everyone on the same page so that I can
describe the later features without worrying about the ground that I’m building on.
All of the topics we’ve covered are core to C# and .NET, but I’ve seen a lot of mis-
understandings around them within community discussions. Although this chapter
hasn’t gone into much depth about any one point, it’ll hopefully have cleared up any
confusion that would’ve made the rest of the book harder to understand.
The three core topics we briefly covered in this chapter have all been significantly
enhanced since C# 1, and some features touch on more than one topic. In particular,
the addition of generics has an impact on almost every area we’ve covered in this
chapter—it’s probably the most widely used and important feature in C# 2. Now that
we’ve finished all our preparations, we can start looking at generics properly in the
next chapter.


<!-- PDF page 88 -->

## Part 2

## C# 2: Solving the

## issues of C# 1

## In part 1 we took a quick look at a few of the features of C# 2. Now it’s time to

do the job properly. You’ll see how C# 2 fixes various problems that developers
ran into when using C# 1, and how C# 2 makes existing features more useful by
streamlining them. This is no mean feat, and life with C# 2 is much more pleas-
ant than with C# 1.
The new features in C# 2 have a certain amount of independence. That’s not
to say they’re not related at all; many of the features are based on—or at least
interact with—the massive contribution that generics make to the language. But
the different topics we’ll look at in the next five chapters don’t combine into one
super-feature.
The first four chapters of this part cover the biggest new features. We’ll look
at the following:
Generics—The most important new feature in C# 2 (and indeed in the CLR
for .NET 2.0), generics allow type and method parameterization in terms
of the types they interact with.
Nullable types—Value types such as int and DateTime don’t have any con-
cept of “no value present”; nullable types allow you to represent the
absence of a meaningful value.
Delegates—Although delegates haven’t changed at the CLR level, C# 2
makes them a lot easier to work with. In addition to a few simple shortcuts,
the introduction of anonymous methods begins the movement toward a
more functional style of programming—a trend that continues in C# 3.


<!-- PDF page 89 -->

Iterators—Although using iterators has always been simple in C# with the
foreach statement, it’s a pain to implement them in C# 1. The C# 2 compiler is
happy to build a state machine for you behind the scenes, hiding a lot of the
complexity involved.
Once we’ve covered the major, complex new features of C# 2 with a chapter dedicated
to each one, chapter 7 rounds off the coverage by introducing several simpler fea-
tures. Simpler doesn’t necessarily mean less useful; partial types, in particular, are cru-
cial for better designer support in versions of Visual Studio from 2005 onward. The
same feature is beneficial for other generated code, too. Likewise, many C# develop-
ers take the ability to write a property with a public getter and a private setter for
granted these days, but it was only introduced in C# 2.
When the first edition of this book was published, many developers still hadn’t
used C# 2 at all. My impression in 2013 is that it’s rare to find someone who’s currently
using C#, but who hasn’t at least dabbled with C# 2, probably 3, and quite often 4. The
topics covered here are fundamental to how later versions of C# work; in particular,
attempting to learn about LINQ without understanding generics and iterators would
be tricky. The chapter on iterators is also related to C# 5’s asynchronous methods; the
two features are very different on the face of it, but both involve state machines built
by the compiler to change the conventional flow of execution.
If you’ve been using C# 2 and upward for a while, you may find a lot of this part
covers familiar ground, but I suspect you’ll still benefit from a deeper knowledge of
the details presented.
