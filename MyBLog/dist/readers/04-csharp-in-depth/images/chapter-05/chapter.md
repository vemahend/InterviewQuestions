# Chapter 5: Fast-tracked delegates

> Source: C# in Depth, Third Edition — Jon Skeet. Original PDF pages 164–189.

[← Table of contents](../README.md)


<!-- PDF page 164 -->

## Fast-tracked delegates

This chapter covers
Long-winded C# 1 syntax
Simplified delegate construction
Covariance and contravariance
Anonymous methods
Captured variables
The journey of delegates in C# and .NET has been an interesting one, showing
remarkable foresight (or really good luck) on the part of the designers. The con-
ventions suggested for event handlers in .NET 1.0/1.1 didn’t make a lot of sense—
until C# 2 showed up. Likewise, the effort put into delegates for C# 2 seems in some
ways out of proportion to how widely used they are—until you see how pervasive
they are in idiomatic C# 3 code. In other words, it’s as if the language and platform
designers had a vision of at least the rough direction they’d be taking, years before
the destination itself became clear.
Of course, C# 3 isn’t a final destination in itself—generic delegates get a bit
more flexibility in C# 4, C# 5 makes it easy to write asynchronous delegates, and we
may see even more advances in the future—but the differences between C# 1 and


<!-- PDF page 165 -->

Fast-tracked delegates
C# 3 in this area are the most startling ones. (The primary change in C# 3 supporting
delegates is in lambda expressions, which you’ll meet in chapter 9.)
C# 2 is a sort of stepping stone in terms of delegates. Its new features pave the way
for the dramatic changes of C# 3, keeping developers reasonably comfortable while still
providing useful benefits. I’m reliably informed that language designers were aware
that the combined feature set of C# 2 would open up whole new ways of looking at
code, but they didn’t necessarily know where those paths would lead. So far, their
instincts have proved remarkably beneficial in the area of delegates.
Delegates play a more prominent part in .NET 2.0 than in earlier versions,
although they’re not as common as they are in .NET 3.5. In chapter 3 you saw how
they can be used to convert from one type of list to another, and way back in chapter 1
you sorted a list of products using the Comparison delegate instead of the IComparer
interface. Although the framework and C# keep a respectful distance from each other
where possible, I believe that the language and platform drove each other in this case:
the inclusion of more delegate-based API calls supports the improved syntax available
in C# 2, and vice versa.
In this chapter, we’ll look at how C# 2 includes two small changes that make life
easier when creating delegate instances from normal methods, and then we’ll look at
the biggest change: anonymous methods, which allow you to specify a delegate
instance’s action inline at the point of its creation. The largest section of the chapter is
devoted to the most complicated part of anonymous methods—captured variables—
which provide delegate instances with a richer environment to play in. We’ll cover the
topic in significant detail due to its importance and complexity. Once you’ve come to
grips with anonymous methods, lambda expressions are easy to understand.
First, though, let’s review the pain points of C# 1’s delegate facilities.
5.1
Saying goodbye to awkward delegate syntax
The syntax for delegates in C# 1 doesn’t sound too bad—the language already has syn-
tactic sugar around Delegate.Combine, Delegate.Remove, and the invocation of dele-
gate instances. It makes sense to specify the delegate type when creating a delegate
instance; after all, it’s the same syntax used to create instances of other types.
This is all true, but for some reason it also sucks. It’s hard to say exactly why the del-
egate creation expressions of C# 1 raise hackles, but they do—at least for me. When
hooking up a bunch of event handlers, it just looks ugly to have to write new Event-
Handler (or whatever is required) all over the place, when the event itself has speci-
fied which delegate type it’ll use. Beauty is in the eye of the beholder, of course, and
you could argue that there’s less call for guesswork when reading event handler wiring
code in the C# 1 style, but the extra text just gets in the way and distracts from the
important part of the code: the method you want to handle the event.
Life becomes more black and white when you consider covariance and contravari-
ance as applied to delegates. Suppose you have an event handling method that saves
the current document, or logs that it’s been called, or performs any number of other


<!-- PDF page 166 -->

Saying goodbye to awkward delegate syntax
actions that may not need to know details of the event. The event itself shouldn’t
mind that your method is capable of working with only the information provided by
the EventHandler signature, even though the event is declared to pass in mouse event
details. Unfortunately, in C# 1 you need to have a different method for each different
event handler signature.
Likewise it’s undeniably ugly to write methods that are so simple that their imple-
mentation is shorter than their signature, solely because delegates need to have an
action to execute in the form of a method. It adds an extra layer of indirection
between the code creating the delegate instance and the code that should execute
when it’s invoked. Extra layers of indirection are often welcome—that option hasn’t
been removed in C# 2—but at the same time it frequently makes the code harder to
read and pollutes the class with a bunch of methods that are only used for delegates.
Unsurprisingly, all of these issues are improved greatly in C# 2. The syntax can still
be wordier than you might like (until you get lambda expressions in C# 3), but the dif-
ference is significant. To illustrate the pain, we’ll start with some code in C# 1 and
improve it in the next couple of sections. The following listing builds a (very) simple
form with a button and then subscribes to three of the button’s events.
Listing 5.1
Subscribing to three of a button’s events
static void LogPlainEvent(object sender, EventArgs e)
{
Console.WriteLine("LogPlain");
}
static void LogKeyEvent(object sender, KeyPressEventArgs e)
{
Console.WriteLine("LogKey");
}
static void LogMouseEvent(object sender, MouseEventArgs e)
{
Console.WriteLine("LogMouse");
}
...
Button button = new Button();
button.Text = "Click me";
button.Click
+= new EventHandler(LogPlainEvent);
button.KeyPress
+= new KeyPressEventHandler(LogKeyEvent);
button.MouseClick += new MouseEventHandler(LogMouseEvent);
Form form = new Form();
form.AutoSize = true;
form.Controls.Add(button);
Application.Run(form);
The output lines in the three event handling methods are there to prove that the code
is working: if you press the spacebar with the button highlighted, you’ll see that the
Click and KeyPress events are both raised. Pressing Enter just raises the Click event;


<!-- PDF page 167 -->

Fast-tracked delegates
clicking on the button raises the Click and MouseClick events. In the following sec-
tions, we’ll improve this code using some of the C# 2 features.
Let’s start by asking the compiler to make a pretty obvious deduction—which dele-
gate type you want to use when subscribing to an event.
5.2
Method group conversions
In C# 1, if you want to create a delegate instance, you need to specify both the dele-
gate type and the action. Chapter 2 defined the action as the method to call and (for
instance methods) the target as the object it’s called on.
For example, in listing 5.1, this expression was used to create a KeyPressEvent-
Handler:
new KeyPressEventHandler(LogKeyEvent)
As a standalone expression, it doesn’t look too bad. Even used in a simple event sub-
scription it’s tolerable. It becomes uglier when used as part of a longer expression,
though. A common example of this is starting a new thread:
Thread t = new Thread(new ThreadStart(MyMethod));
What you want to do is start a new thread that’ll execute MyMethod. As ever, you want
to express yourself as simply as possible, and C# 2 allows you to do this by means of an
implicit conversion from a method group to a compatible delegate type. A method
group is simply the name of a method, optionally with a target—exactly the same kind
of expression you used in C# 1 to create delegate instances. (Indeed, the expression
was called a method group back then—it’s just that the conversion wasn’t available.) If
the method is generic, the method group may also specify type arguments—although
this is rarely used, in my experience. The new implicit conversion allows you to turn
your event subscription into
button.KeyPress += LogKeyEvent;
Likewise, the thread-creation code becomes simply
Thread t = new Thread(MyMethod);
The readability differences between the original and the streamlined versions aren’t
huge for a single line, but in the context of a significant amount of code, they can
reduce the clutter considerably. To make it seem less like magic, let’s briefly look at
what this conversion is doing.
First, let’s consider the expressions LogKeyEvent and MyMethod as they appear in
the examples. The reason they’re classified as method groups is because more than
one method may be available, due to overloading. The implicit conversions available
will convert a method group to any delegate type with a compatible signature. So, if
you had two method signatures like these,
void MyMethod()
void MyMethod(object sender, EventArgs e)


<!-- PDF page 168 -->

Covariance and contravariance
you could use MyMethod as the method group in an assignment to either a Thread-
Start or an EventHandler, as follows:
ThreadStart x = MyMethod;
EventHandler y = MyMethod;
But you couldn’t use it as the parameter to a method that itself was overloaded to take
either a ThreadStart or an EventHandler—the compiler would complain that the
call was ambiguous. Likewise, you unfortunately can’t use an implicit method group
conversion to convert to the plain System.Delegate type, because the compiler
doesn’t know which specific delegate type to create an instance of. This is a pain, but
you can still be slightly briefer than in C# 1 by making the conversion explicit. Here’s
an example:
Delegate invalid = SomeMethod;
Delegate valid = (ThreadStart)SomeMethod;
For local variables this usually isn’t a problem, but it’s somewhat more annoying when
you’re using an API that has a parameter of type Delegate, such as Control.Invoke.
There are a few solutions here: using a helper method, casting, or using an intermedi-
ate variable. Here’s an example using the MethodInvoker delegate type, which takes
no parameters and doesn’t return anything:
static void SimpleInvoke(Control control,
MethodInvoker invoker)
{
control.Invoke(invoker);
}
...
SimpleInvoke(form, UpdateUI);
form.Invoke((MethodInvoker)UpdateUI);
MethodInvoker invoker = UpdateUI;
form.Invoke(invoker);
Invokes with a helper method
Invokes with a cast
Invokes with a local variable
Different situations will encourage different solutions; none of these is particularly
appealing, but they’re not awful either.1
As with generics, the precise rules of conversion validity are slightly complicated,
and the just-try-it approach works well; if the compiler complains that it doesn’t have
enough information, just tell it what conversion to use, and all should be well. If it
doesn’t complain, you should be fine. For the exact details, consult the language spec-
ification, section 6.6 (“Method group conversions”). Speaking of possible conversions,
there may be more than you expect, as you’ll see in the next section.
5.3
Covariance and contravariance
We’ve already talked a lot about the concepts of covariance and contravariance in dif-
ferent contexts, usually bemoaning their absence, but delegate construction is the
one area in which they’re available in C# prior to version 4. If you want to refresh
1 Extension methods (discussed in chapter 10) make the helper method approach somewhat more appealing
if you’re using C# 3.


<!-- PDF page 169 -->

Fast-tracked delegates
yourself about the meaning of the terms at a relatively detailed level, refer back to sec-
tion 2.2.2, but the gist of the topic with respect to delegates is that if it would be valid
(in a static typing sense) to call a method and use its return value everywhere that you
could invoke an instance of a particular delegate type and use its return value, then
that method can be used to create an instance of that delegate type. That’s wordy—it’s
a lot simpler with examples.
DIFFERENT TYPES OF VARIANCE IN DIFFERENT VERSIONS
You may already be
aware that C# 4 offers generic covariance and contravariance for delegates and
interfaces. This is entirely different from the variance we’re looking at here—
we’re only dealing with creating new instances of delegates at the moment.
The generic variance in C# 4 uses reference conversions, which don’t create new
objects—they just view the existing object as a different type.
We’ll look at contravariance first, and then covariance.
5.3.1
Contravariance for delegate parameters
Let’s consider the event handlers in the little Windows Forms application in
listing 5.1. The signatures of the three delegate types are as follows:2
void EventHandler(object sender, EventArgs e)
void KeyPressEventHandler(object sender, KeyPressEventArgs e)
void MouseEventHandler(object sender, MouseEventArgs e)
Consider that KeyPressEventArgs and MouseEventArgs both derive from EventArgs
(as do a lot of other types—MSDN lists 403 types that derive directly from EventArgs
in .NET 4). If you have a method with an EventArgs parameter, you could always call it
with a KeyPressEventArgs argument instead. It therefore makes sense to be able to
use a method with the same signature as EventHandler to create an instance of Key-
PressEventHandler, and that’s exactly what C# 2 does. This is an example of contra-
variance of parameter types.
To see that in action, think back to listing 5.1 and suppose that you don’t need to
know which event was firing—you just want to write out the fact that an event has hap-
pened. Using method group conversions and contravariance, the code becomes a lot
simpler, as shown in the following listing.
Listing 5.2
Demonstration of method group conversions and delegate contravariance
static void LogPlainEvent(object sender, EventArgs e)
{
Console.WriteLine("An event occurred");
}
...
Button button = new Button();
button.Text = "Click me";
button.Click += LogPlainEvent;
Handles
all events
B
Uses method
group conversion
C
2 I’ve removed the public delegate part for reasons of space.


<!-- PDF page 170 -->

Covariance and contravariance
button.KeyPress += LogPlainEvent;
button.MouseClick += LogPlainEvent;
Uses conversion
and contravariance
D
Form form = new Form();
form.AutoSize = true;
form.Controls.Add(button);
Application.Run(form);
The two handler methods that dealt specifically with key and mouse events have
been completely removed, and you’re now using one event handling method for
everything B. Of course, this isn’t terribly useful if you want to do different things for
different types of events, but sometimes all you need to know is that an event occurred
and, potentially, the source of the event. The subscription to the Click event C only
uses the implicit conversion we discussed in the previous section because it has a sim-
ple EventArgs parameter, but the other event subscriptions D involve the conversion
and contravariance due to their different parameter types.
I mentioned earlier that the .NET 1.0/1.1 event handler convention didn’t make
much sense when it was first introduced. This example shows exactly why the guide-
lines are more useful with C# 2. The convention dictates that event handlers should
have a signature with two parameters, the first of which is of type object and is the ori-
gin of the event, and the second of which carries any extra information about the
event in a type deriving from EventArgs. Before contravariance became available, this
wasn’t useful—there was no benefit to making the informational parameter derive
from EventArgs, and sometimes there wasn’t much use for the origin of the event. It
was often more sensible to pass the relevant information directly in the form of nor-
mal parameters with appropriate types, just like any other method. Now you can use a
method with the EventHandler signature as the action for any delegate type that hon-
ors the convention.
So far we’ve looked at the values entering a method or delegate—what about the
value coming out?
5.3.2
Covariance of delegate return types
Demonstrating covariance is harder, as relatively few of the delegates available in .NET
2.0 are declared with a nonvoid return type, and those that are tend to return value
types. There are some available, but it’s easier to declare your own delegate type that
uses Stream as its return type. For simplicity, we’ll make it parameterless:3
delegate Stream StreamFactory();
You can now use this with a method that’s declared to return a specific type of stream,
as shown in the following listing. You declare a method that always returns a Memory-
Stream with some sequential data (bytes 0, 1, 2, and so on up to 15), and then use that
method as the action for a StreamFactory delegate instance.
3 Return type covariance and parameter type contravariance can be used at the same time, but you’re unlikely
to come across situations where that would be useful.


<!-- PDF page 171 -->

Fast-tracked delegates
Listing 5.3
Demonstration of covariance of return types for delegates
Declares delegate type returning Stream
B
delegate Stream StreamFactory();
static MemoryStream GenerateSampleData()
{
byte[] buffer = new byte[16];
for (int i = 0; i < buffer.Length; i++)
{
buffer[i] = (byte) i;
}
return new MemoryStream(buffer);
}
...
StreamFactory factory = GenerateSampleData;
Declares method
returning
MemoryStream
C
Converts method group
with covariance
D
using (Stream stream = factory())
{
int data;
while ((data = stream.ReadByte()) != -1)
{
Console.WriteLine(data);
}
}
Invokes delegate to
obtain stream
E
The generation and display of the data in listing 5.3 is only present to give the code
something to do. The important points are the annotated lines. You declare that the
delegate type has a return type of Stream B, but the GenerateSampleData method
has a return type of MemoryStream C. The line creating the delegate instance D per-
forms the conversion you saw earlier and uses covariance of return types to allow
GenerateSampleData to be used as the action for StreamFactory. By the time you
invoke the delegate instance E, the compiler no longer knows that a MemoryStream
will be returned—if you changed the type of the stream variable to MemoryStream,
you’d get a compilation error.
Covariance and contravariance can also be used to construct one delegate instance
from another. For instance, consider these two lines of code (which assume an appro-
priate HandleEvent method):
EventHandler general = new EventHandler(HandleEvent);
KeyPressEventHandler key = new KeyPressEventHandler(general);
The first line is valid in C# 1, but the second isn’t—in order to construct one delegate
from another in C# 1, the signatures of the two delegate types involved have to match.
For instance, you could create a MethodInvoker from a ThreadStart, but you couldn’t
create a KeyPressEventHandler from an EventHandler as shown in the second line.
You’re using contravariance to create a new delegate instance from an existing one
with a compatible delegate type signature, where compatibility is defined in a less
restrictive manner in C# 2 than in C# 1.
All of this is positive, except for one small fly in the ointment.


<!-- PDF page 172 -->

Covariance and contravariance
5.3.3
A small risk of incompatibility
This new flexibility in C# 2 creates one of the few cases where existing valid C# 1 code
may produce different results when compiled under C# 2. Suppose a derived class
overloads a method declared in its base class, and you try to create an instance of a
delegate using a method group conversion. A conversion that previously only
matched the base class method could match the derived class method due to covari-
ance or contravariance in C# 2, in which case that derived class method would be cho-
sen by the compiler. The following listing gives an example of this.
Listing 5.4
Demonstration of breaking change between C# 1 and C# 2
delegate void SampleDelegate(string x);
public void CandidateAction(string x)
{
Console.WriteLine("Snippet.CandidateAction");
}
public class Derived : Snippet
{
public void CandidateAction(object o)
{
Console.WriteLine("Derived.CandidateAction");
}
}
...
Derived x = new Derived();
SampleDelegate factory = new SampleDelegate(x.CandidateAction);
factory("test");
Remember that Snippy4 will be generating all of this code within a class called
Snippet, which the nested type derives from. Under C# 1, listing 5.4 would print
Snippet.CandidateAction because the method taking an object parameter wasn’t
compatible with SampleDelegate. Under C# 2, the method is compatible, and it’s the
method chosen due to being declared in a more derived type, so the result is that
Derived.CandidateAction is printed.
Fortunately, the C# 2 compiler knows that this is a breaking change and issues an
appropriate warning. I’ve included this section because you ought to be aware of the
possibility of such a problem, but I’m sure it’s rarely encountered in real life.
Enough doom and gloom about potential breakage. We’ve still got to see the most
important new feature regarding delegates: anonymous methods. They’re a bit more
complicated than the topics we’ve covered so far, but they’re also very powerful—and
a large step toward C# 3.
4 In case you skipped the first chapter, Snippy is a tool I’ve built to create short but complete code samples. See
section 1.8.1 for more details.


<!-- PDF page 173 -->

Fast-tracked delegates
5.4
Inline delegate actions with anonymous methods
Back in C# 1, it was common to implement a delegate with a particular signature,
even though you already had a method with exactly the right behavior but a slightly
different set of parameters. Likewise, you’d often want a delegate to do just one
teeny, tiny thing—but that meant you needed a whole extra method. The new
method would represent behavior that was only relevant within the original method,
but it was now exposed to the whole class, creating noise in IntelliSense and generally
getting in the way.
All this was intensely frustrating. The covariance and contravariance features
we’ve just talked about can sometimes help with the first problem, but often they don’t.
Anonymous methods, which are also new in C# 2, can pretty much always help with
these issues.
Informally, anonymous methods allow you to specify the action for a delegate
instance inline as part of the delegate instance creation expression. They also provide
some far more powerful behavior in the form of closures, but we’ll come to those in
section 5.5. For the moment, let’s stick with relatively simple stuff.
First we’ll look at examples of anonymous methods that take parameters but don’t
return any values; then we’ll explore the syntax involved in providing return values and
a shortcut available when you don’t need to use the parameter values passed to you.
5.4.1
Starting simply: acting on a parameter
.NET 2.0 introduced a generic delegate type called Action<T>, which we’ll use for our
examples. Its signature is simple (aside from the fact that it’s generic):
public delegate void Action<T>(T obj)
In other words, an Action<T> does something with a value of type T; for example, an
Action<string> could reverse the string and print it out, an Action<int> could print
out the square root of the number passed to it, and an Action<IList<double>> could
find the average of all the numbers given to it and print that out. By complete coinci-
dence, these examples are all implemented using anonymous methods in the follow-
ing listing.
Listing 5.5
Anonymous methods used with the Action<T> delegate type
Action<string> printReverse = delegate(string text)
{
char[] chars = text.ToCharArray();
Array.Reverse(chars);
Console.WriteLine(new string(chars));
};
Uses anonymous
method to create
Action<string>
B
Action<int> printRoot = delegate(int number)
{
Console.WriteLine(Math.Sqrt(number));
};


<!-- PDF page 174 -->

Inline delegate actions with anonymous methods
Action<IList<double>> printMean = delegate(IList<double> numbers)
{
double total = 0;
foreach (double value in numbers)
{
total += value;
}
Console.WriteLine(total / numbers.Count);
};
Uses loop in
anonymous
method
C
Invokes delegates as normal
D
printReverse("Hello world");
printRoot(2);
printMean(new double[] { 1.5, 2.5, 3, 4.5 });
Listing 5.5 shows a few of the different features of anonymous methods. First, there’s
the syntax of anonymous methods: use the delegate keyword, followed by the param-
eters (if there are any), followed by the code for the action of the delegate instance, in
a block. The string-reversal code B shows that the block can contain local variable
declarations, and the list-averaging code C demonstrates looping within the block.
Basically, you can do (almost) anything in an anonymous method that you can do in a
normal method body. Likewise, the result of an anonymous method is a delegate
instance that can be used like any other one D. But be warned that contravariance
doesn’t apply to anonymous methods; you have to specify the parameter types that
match the delegate type exactly.
A COUPLE OF RESTRICTIONS…
One slight oddity is that if you’re writing an
anonymous method in a value type, you can’t reference this from within it.
There’s no such restriction within a reference type. Additionally, in the
Microsoft C# 2 and 3 compiler implementations, accessing a base member
within an anonymous method via the base keyword resulted in a warning that
the resulting code was unverifiable. This has been fixed in the C# 4 compiler.
In terms of implementation, you’re still creating a method in IL for each anonymous
method in the source code. The compiler will generate a method within the existing
class and use that as the action when it creates the delegate instance, just as if it were a
normal method.5 The CLR neither knows nor cares that an anonymous method was
used. You can see the extra methods within the compiled code using ildasm or Reflec-
tor. (Reflector knows how to interpret the IL to display anonymous methods in the
method that uses them, but the extra methods are still visible.) These methods have
unspeakable names—ones that are valid in IL, but invalid in C#. This stops you from
attempting to refer to them directly in your C# code and avoids the possibility of nam-
ing collisions. Many of the features of C# 2 and later versions are implemented in a
similar way; one easy way to spot them is that they usually contain angle brackets. For
example, an anonymous method in a Main method might cause a method called
<Main>b__0 to be created. It’s entirely implementation-specific, though. Microsoft
5 You’ll see in section 5.5.4 that although there’s always a new method, it’s not always created where you might
expect.


<!-- PDF page 175 -->

Fast-tracked delegates
could change its private conventions in a future version, for example. This shouldn’t
break anything, as nothing should be relying on these names.
It’s worth pointing out at this stage that listing 5.5 is exploded compared with how
anonymous methods normally look in real code. You’ll often see them used as argu-
ments to another method (rather than assigned to a variable of the delegate type) and
with few line breaks—compactness is part of the reason for using them, after all. To
demonstrate this, we’ll use the List<T>.ForEach method that takes an Action<T> as a
parameter and performs that action on each element. The following listing shows an
extreme example, applying the same square-rooting action you used in listing 5.5, but
in a compact form.
Listing 5.6
Extreme example of code compactness. Warning: unreadable code ahead!
List<int> x = new List<int>();
x.Add(5);
x.Add(10);
x.Add(15);
x.Add(20);
x.Add(25);
x.ForEach(delegate(int n){Console.WriteLine(Math.Sqrt(n));});
That’s pretty horrendous—especially when the last six characters appear to be
ordered almost at random. There’s a happy medium, of course. I tend to break my
usual “braces on a line on their own” rule for anonymous methods (as I do for trivial
properties), but I still allow a decent amount of whitespace. I might well write the last
line of listing 5.6 in one of these two forms:
x.ForEach(delegate(int n)
{ Console.WriteLine(Math.Sqrt(n)); }
);
x.ForEach(delegate(int n) {
Console.WriteLine(Math.Sqrt(n));
});
Even just adding spaces to listing 5.6 would’ve helped. In each of these formats, the
parentheses and braces are now less confusing, and the what-it-does part stands out
appropriately. Of course, how you space out your code is entirely your own business,
but I encourage you to actively think about where you want to strike the balance, and
talk about it with your teammates to try to achieve some consistency. Consistency
doesn’t always lead to the most readable code, though—sometimes keeping every-
thing on one line is the most straightforward format.
So far the only interaction you’ve had with the calling code is through parameters.
What about return values?


<!-- PDF page 176 -->

Inline delegate actions with anonymous methods
5.4.2
Returning values from anonymous methods
The Action<T> delegate has a void return type, so you haven’t had to return anything
from your anonymous methods yet. To demonstrate how you can do so when you need
to, we’ll use the Predicate<T> delegate type from .NET 2.0, which has this signature:
public delegate bool Predicate<T>(T obj)
The following listing shows an anonymous method creating an instance of
Predicate<T> to return whether the argument passed in is odd or even. Predicates
are usually used in filtering and matching—you could use the code in this listing to fil-
ter a list for just the even elements, for instance.
Listing 5.7
Returning a value from an anonymous method
Predicate<int> isEven = delegate(int x) { return x % 2 == 0; };
Console.WriteLine(isEven(1));
Console.WriteLine(isEven(4));
The new syntax is almost certainly what you’d have expected—you return the appro-
priate value as if the anonymous method were a normal method. You may have
expected to see a return type declared near the delegate keyword, but there’s no
need. The compiler checks that all the possible return values are compatible with the
declared return type of the delegate type it’s trying to convert the anonymous
method into.
JUST WHAT ARE YOU RETURNING FROM?
When you return a value from an
anonymous method, it really is only returning from the anonymous
method—it’s not returning from the method creating the delegate instance.
It’s easy to look down some code, see the return keyword, and think that it’s
an exit point from the current method, so be careful.
As I mentioned before, relatively few delegates in .NET 2.0 return values, although as
you’ll see in part 3 of this book, .NET 3.5 uses this idea much more often, particularly
with LINQ. There’s another reasonably common delegate type in .NET 2.0 though:
Comparison<T>, which can be used when sorting collections. It’s the delegate equiva-
lent of the IComparer<T> interface. Often you only need a particular sort order in one
situation, so it makes sense to be able to specify that order inline, rather than expos-
ing it as a method within the rest of the class. The following listing demonstrates this,
printing out the files within the C:\ directory, ordering them first by name and then
(separately) by size.
Listing 5.8
Using anonymous methods to sort files simply
static void SortAndShowFiles(string title, Comparison<FileInfo> sortOrder)
{
FileInfo[] files = newDirectoryInfo(@"C:\").GetFiles();
Array.Sort(files, sortOrder);


<!-- PDF page 177 -->

Fast-tracked delegates
Console.WriteLine(title);
foreach (FileInfo file in files)
{
Console.WriteLine (" {0} ({1} bytes)", file.Name, file.Length);
}
}
...
SortAndShowFiles("Sorted by name:", delegate(FileInfo f1, FileInfo f2)
{ return f1.Name.CompareTo(f2.Name); }
);
SortAndShowFiles("Sorted by length:", delegate(FileInfo f1, FileInfo f2)
{ return f1.Length.CompareTo(f2.Length); }
);
If you weren’t using anonymous methods, you’d need a separate method for each sort
order. Instead, listing 5.8 makes it clear what you’ll sort by in each case right where
you call SortAndShowFiles. (Sometimes you’ll be calling Sort directly at the point
where the anonymous method is called for. In listing 5.8, you’re performing the same
fetch/sort/display sequence twice, just with different sort orders, so I encapsulated
those steps in their own method.)
One special syntactic shortcut is sometimes applicable. If you don’t care about the
parameters of a delegate, you don’t have to declare them at all. Let’s see how that
works.
5.4.3
Ignoring delegate parameters
Occasionally, you want to implement a delegate that doesn’t depend on its parameter
values. You might want to write an event handler whose behavior is only appropriate
for one event and doesn’t depend on the event arguments—saving the user’s work,
for instance. The event handlers from the example in listing 5.1 fit this criterion per-
fectly. In this case, you can leave out the parameter list entirely, just using the
delegate keyword and then a block of code as the action for the method. The follow-
ing listing is equivalent to listing 5.1 but uses the shorter syntax.
Listing 5.9
Subscribing to events with anonymous methods that ignore parameters
Button button = new Button();
button.Text = "Click me";
button.Click
+= delegate { Console.WriteLine("LogPlain"); };
button.KeyPress
+= delegate { Console.WriteLine("LogKey"); };
button.MouseClick += delegate { Console.WriteLine("LogMouse"); };
Form form = new Form();
form.AutoSize = true;
form.Controls.Add(button);
Application.Run(form);
Normally you’d have to write each subscription as something like this:
button.Click += delegate(object sender, EventArgs e) { ... };


<!-- PDF page 178 -->

Inline delegate actions with anonymous methods
That wastes a lot of space for little reason—you don’t need the values of the parame-
ters, so the compiler lets you get away with not specifying them at all.
I’ve found this shortcut most useful when it comes to implementing my own
events. For example, I get sick of having to perform a nullity check before raising an
event. One way of getting around this is to make sure that the event starts off with a
handler, which is then never removed. As long as the handler doesn’t do anything, all
you lose is a tiny bit of performance. Before C# 2, you had to explicitly create a
method with the right signature, which usually wasn’t worth the benefit, but now you
can write code like this:
public event EventHandler Click = delegate {};
From then on, you can just call Click without any nullity tests.
You should be aware of one trap related to this parameter wildcarding feature—if
the anonymous method could be converted to multiple delegate types (for example,
to call different method overloads), the compiler needs more help. To show you what
I mean, let’s take the same troublesome example we looked at with method group
conversions: starting a new thread. There are four thread constructors in .NET 2.0:
public Thread(ParameterizedThreadStart start)
public Thread(ThreadStart start)
public Thread(ParameterizedThreadStart start, int maxStackSize)
public Thread(ThreadStart start, int maxStackSize)
These are the two delegate types involved:
public delegate void ThreadStart()
public delegate void ParameterizedThreadStart(object obj)
Now, consider the following three attempts to create a new thread:
new Thread(delegate()
{ Console.WriteLine("t1"); } );
new Thread(delegate(object o) { Console.WriteLine("t2"); } );
new Thread(delegate
{ Console.WriteLine("t3"); } );
The first and second lines contain parameter lists—the compiler knows that it can’t
convert the anonymous method in the first line into a ParameterizedThreadStart or
convert the anonymous method in the second line into a ThreadStart. Those lines
compile because there’s only one applicable constructor overload in each case. The
third line, though, is ambiguous—the anonymous method can be converted into
either delegate type, so both of the single parameter constructor overloads are appli-
cable. In this situation, the compiler throws its hands up and issues an error. You can
solve this either by specifying the parameter list explicitly or casting the anonymous
method to the right delegate type.
Hopefully what you’ve seen of anonymous methods so far will have provoked some
thought about your own code and made you consider where you could use these tech-
niques to good effect. Indeed, even if anonymous methods could only do what you’ve
already seen, they’d be very useful. But there’s more to anonymous methods than just
avoiding the inclusion of an extra method in your code. Anonymous methods are


<!-- PDF page 179 -->

Fast-tracked delegates
C# 2’s implementation of a feature known elsewhere as closures by way of captured vari-
ables. The next section explains both of these terms and shows how anonymous meth-
ods can be extremely powerful—and confusing if you’re not careful.
5.5
Capturing variables in anonymous methods
I don’t like having to give warnings, but I think it makes sense to include one here: if
this topic is new to you, then don’t start this section until you’re feeling reasonably
awake and have a bit of time to spend on it. I don’t want to alarm you unnecessarily,
and you should feel confident that there’s nothing here so insanely complicated that
you won’t be able to understand it with a little effort. It’s just that captured variables
can be somewhat confusing to start with, partly because they overturn some of your
existing knowledge and intuition.
Stick with it, though! The payback can be massive in terms of code simplicity and
readability. This topic will also be crucial when we look at lambda expressions and
LINQ in C# 3, so it’s worth the investment.
Let’s start with a few definitions.
5.5.1
Defining closures and different types of variables
The concept of closures is an old one, first implemented in Scheme, but it’s been gain-
ing more prominence in recent years as more mainstream languages have taken it on
board. The basic idea is that a function6 is able to interact with an environment
beyond the parameters provided to it. That’s all there is to it in abstract terms, but to
understand how it applies to C# 2, we need a couple more terms:
An outer variable is a local variable or parameter (excluding ref and out param-
eters) whose scope includes an anonymous method. The this reference also
counts as an outer variable of any anonymous method within an instance mem-
ber of a class.
A captured outer variable (usually shortened to captured variable) is an outer vari-
able that’s used within an anonymous method. To go back to closures, the func-
tion part is the anonymous method, and the environment it can interact with is
the set of variables captured by it.
That’s all very dry and may be hard to imagine, but the main thrust is that an anony-
mous method can use local variables defined in the same method that declares it. This
may not sound like a big deal, but in many situations it’s enormously handy—you can
use contextual information that you have on hand rather than having to set up extra
types just to store data you already know. We’ll look at some useful concrete examples
soon, I promise—but first it’s worth looking at some code to clarify these definitions.
Listing 5.10 provides an example with a number of local variables, and it’s a single
method, so it can’t be run on its own. I’m not going to explain how it would work or
6 This is general computer science terminology, not C# terminology.


<!-- PDF page 180 -->

Capturing variables in anonymous methods
what it would do yet; I just want to discuss how the different variables are classified.
Again, we’ll use the MethodInvoker delegate type for simplicity.
Listing 5.10
Examples of variable kinds with respect to anonymous methods
void EnclosingMethod()
{
int outerVariable = 5;
string capturedVariable = "captured";
Outer variable
(uncaptured)
B
Outer variable captured
by anonymous method
C
if (DateTime.Now.Hour == 23)
{
int normalLocalVariable = DateTime.Now.Minute;
Console.WriteLine(normalLocalVariable);
}
Local variable of
normal method
D
MethodInvoker x = delegate()
{
string anonLocal = "local to anonymous method";
Console.WriteLine(capturedVariable + anonLocal);
};
x();
}
Local variable of
anonymous method
E
Capture of
outer variable
F
Let’s go through all the variables from the simplest to the most complicated:

normalLocalVariable D isn’t an outer variable because there are no anony-
mous methods within its scope. It behaves exactly the way that local variables
always have.

anonLocal E isn’t an outer variable either, but it’s local to the anonymous
method, not to EnclosingMethod. It’ll only exist (in terms of being present in
an executing stack frame) when the delegate instance is invoked.

outerVariable B is an outer variable because the anonymous method is
declared within its scope. But the anonymous method doesn’t refer to it, so it’s
not captured.

capturedVariable C is an outer variable because the anonymous method is
declared within its scope, and it’s captured by virtue of being used at F.
Okay, you now understand the terminology, but we’re not a lot closer to seeing what
captured variables do. I suspect you could guess the output if you ran the method
from listing 5.10, but there are some other cases that would probably surprise you.
We’ll start off with a simple example and build up to more complex ones.
5.5.2
Examining the behavior of captured variables
When a variable is captured, it really is the variable that’s captured by the anonymous
method, not its value at the time the delegate instance was created. You’ll see later
that this has far-reaching consequences, but first you need to understand what that
means for a relatively straightforward situation.


<!-- PDF page 181 -->

Fast-tracked delegates
The following listing has a captured variable and an anonymous method that both
prints out and changes the variable. You’ll see that changes to the variable from out-
side the anonymous method are visible within the anonymous method, and vice versa.
Listing 5.11
Accessing a variable both inside and outside an anonymous method
string captured = "before x is created";
MethodInvoker x = delegate
{
Console.WriteLine(captured);
captured = "changed by x";
};
captured = "directly before x is invoked";
x();
Console.WriteLine(captured);
captured = "before second invocation";
x();
The output of listing 5.11 is as follows:
directly before x is invoked
changed by x
before second invocation
Let’s look at how this happens. First, you declare the variable captured and set its
value with a perfectly normal string literal. So far, there’s nothing special about the
variable. You then declare x and set its value using an anonymous method that cap-
tures captured. The delegate instance will always print out the current value of
captured and then set it to “changed by x.” Don’t forget that creating this delegate
instance doesn’t execute it.
To make it absolutely clear that just creating the delegate instance doesn’t read the
variable and stash its value away somewhere, you now change the value of captured to
“directly before x is invoked.” You then invoke x for the first time. It reads the value of
captured and prints it out—the first line of output. It sets the value of captured to
“changed by x” and returns. When the delegate instance returns, the normal method
continues in the usual way. It prints out the current value of captured, giving the sec-
ond line of output.
The normal method then changes the value of captured yet again (this time to
“before second invocation”) and invokes x for the second time. The current value of
captured is printed out, giving the last line of output. The delegate instance changes
the value of captured to “changed by x” and returns, at which point the normal
method has run out of code and it’s done.
That’s a lot of detail about how a short piece of code works, but there’s really only
one crucial idea in it: the captured variable is the same one that the rest of the method uses. For
some people, that’s hard to grasp; for others it comes naturally. Don’t worry if it’s
tricky to start with—it’ll get easier over time.


<!-- PDF page 182 -->

Capturing variables in anonymous methods
Even if you’ve understood everything easily so far, you may be wondering why you’d
want to do any of this. It’s about time we had an example that was actually useful.
5.5.3
What’s the point of captured variables?
To put it simply, captured variables eliminate the need to write extra classes just to
store the information a delegate needs to act on, beyond what it’s passed via parame-
ters. Before ParameterizedThreadStart existed, if you wanted to start a new (non-
threadpool) thread and give it some information—the URL of a page to fetch, for
instance—you had to create an extra type to hold the URL and put the action of the
ThreadStart delegate instance in that type. Even with ParameterizedThreadStart,
your method had to accept a parameter of type object and cast it to the type you
really wanted. It was an ugly way of achieving something that should’ve been simple.
As another example, suppose you had a list of people and wanted to write a
method that would return a second list containing all the people who were under a
given age. List<T> has a method called FindAll that returns another list of every-
thing matching the specified predicate. Before anonymous methods and captured
variables, it wouldn’t have made much sense for List<T>.FindAll to exist, because of
all the hoops you’d have to go through in order to create the right delegate to start
with. It would’ve been simpler to do all the iteration and copying manually. With C# 2,
though, you can do it all very easily:
List<Person> FindAllYoungerThan(List<Person> people, int limit)
{
return people.FindAll(delegate (Person person)
{ return person.Age < limit; }
);
}
Here you’re capturing the limit parameter within the delegate instance—if you’d
had anonymous methods but not captured variables, you could’ve performed a test
against a hardcoded limit, but not one that was passed into the method as a parame-
ter. I hope you’ll agree that this approach is neat: it expresses exactly what you want to
do with much less fuss about exactly how it should happen than you’d have seen in a
C# 1 version. (It’s even neater in C# 3, admittedly…)7 It’s relatively rare that you come
across a situation where you need to write to a captured variable, but again that can
have its uses.
Still with me? Good. So far, you’ve only used the delegate instance within the
method that creates it. That doesn’t raise many questions about the lifetime of the
captured variables—but what would happen if the delegate instance escaped into the
big bad world? How would it cope after the method that created it had finished?
7 In case you’re wondering: return people.Where(person => person.Age < limit);


<!-- PDF page 183 -->

Fast-tracked delegates
5.5.4
The extended lifetime of captured variables
The simplest way of tackling this topic is to state a rule, give an example, and then
think about what would happen if the rule weren’t in place. Here we go:
A captured variable lives for at least as long as any delegate instance referring to it.
Don’t worry if it doesn’t make a lot of sense yet—that’s what the example is for. The
following listing shows a method that returns a delegate instance. That delegate
instance is created using an anonymous method that captures an outer variable. So,
what’ll happen when the delegate is invoked after the method has returned?
Listing 5.12
Demonstration of a captured variable having its lifetime extended
static MethodInvoker CreateDelegateInstance()
{
int counter = 5;
MethodInvoker ret = delegate
{
Console.WriteLine(counter);
counter++;
};
ret();
return ret;
}
...
MethodInvoker x = CreateDelegateInstance();
x();
x();
The output of listing 5.12 consists of the numbers 5, 6, and 7 on separate lines. The
first line of output comes from the invocation of the delegate instance within Create-
DelegateInstance, so it makes sense that the value of counter is available at that
point. But what about after the method has returned? Normally you’d consider
counter to be on the stack, so when the stack frame for CreateDelegateInstance is
destroyed, you’d expect counter to effectively vanish…and yet subsequent invocations
of the returned delegate instance seem to keep using it.
The secret is to challenge the assumption that counter is on the stack in the first
place. It isn’t. The compiler has actually created an extra class to hold the variable.
The CreateDelegateInstance method has a reference to an instance of that class so it
can use counter, and the delegate has a reference to the same instance, which lives on
the heap in the normal way. That instance isn’t eligible for garbage collection until
the delegate is ready to be collected.
Some aspects of anonymous methods are very compiler-specific (different compil-
ers could achieve the same semantics in different ways), but it’s hard to see how the
specified behavior could be achieved without using an extra class to hold the captured
variable. Note that if you only capture this, no extra types are required—the com-
piler just creates an instance method to act as the delegate’s action. As I mentioned
before, you probably shouldn’t worry about the stack and heap details too much, but


<!-- PDF page 184 -->

Capturing variables in anonymous methods
it’s worth knowing what the compiler is capable of doing, just in case you get confused
as to how the specified behavior is even possible.
Okay, so local variables can live on even after a method has returned. You may be
wondering what I could possibly throw at you next—how about multiple delegates
capturing different instances of the same variable? It sounds crazy, so it’s just the kind
of thing you should be expecting by now.
5.5.5
Local variable instantiations
On a good day, captured variables act exactly the way I expect them to at a glance. On
a bad day, I’m still surprised when I’m not careful. When there are problems, it’s
almost always due to my forgetting how many “instances” of local variables I’m actually
creating. A local variable is said to be instantiated each time execution enters the scope
where it’s declared.
Here’s a simple example comparing two very similar bits of code:
int single;
for (int i = 0; i < 10; i++)
{
single = 5;
Console.WriteLine(single + i);
}
for (int i = 0; i < 10; i++)
{
int multiple = 5;
Console.WriteLine(multiple + i);
}
In the good old days, it was reasonable to say that pieces of code like this were seman-
tically identical. Indeed, they’d usually compile to the same IL—and they still will, if
there aren’t any anonymous methods involved. All the space for local variables is allo-
cated on the stack at the start of the method, so there’s no cost to redeclaring the vari-
able for each iteration of the loop.8 In our new terminology, the single variable will
be instantiated only once, but the multiple variable will be instantiated 10 times—it’s
as if there were 10 local variables, all called multiple, which were created one after
another.
I’m sure you can see where I’m going—when a variable is captured, it’s the rele-
vant “instance” of the variable that’s captured. If you captured multiple inside the
loop, the variable captured in the first iteration would be different from the variable
captured the second time round, and so on. The following listing shows exactly this
effect.
Listing 5.13
Capturing multiple variable instantiations with multiple delegates
List<MethodInvoker> list = new List<MethodInvoker>();
for (int index = 0; index < 5; index++)
{
int counter = index * 10;
Instantiates counter
B
8 In my view, it’s also cleaner to redeclare the variable unless you explicitly need to maintain its value between
iterations.


<!-- PDF page 185 -->

Fast-tracked delegates
list.Add(delegate
{
Console.WriteLine(counter);
counter++;
});
}
Prints and increments
captured variable
C
foreach (MethodInvoker t in list)
{
t();
}
list[0]();
list[0]();
list[0]();
Executes all five
delegate instances
D
Executes first one
three more times
E
Executes second one again
F
list[1]();
Listing 5.13 creates five different delegate instances C—one for each time you go
around the loop. Invoking the delegate will print out the value of counter and then
increment it. Because counter is declared inside the loop, it’s instantiated for each
iteration B, and each delegate captures a different variable. When you go through
and invoke each delegate D, you see the different values initially assigned to counter:
0, 10, 20, 30, 40. Just to hammer the point home, when you then go back to the first
delegate instance and execute it three more times E, it keeps going from where that
instance’s counter variable had left off: 1, 2, 3. Finally you execute the second dele-
gate instance F, and that keeps going from where that instance’s counter variable had
left off: 11.
As you can see, each of the delegate instances has captured a different variable.
Before we leave this example, I should point out what would’ve happened if you’d
captured index—the variable declared by the for loop—instead of counter. In this
case, all the delegates would have shared the same variable. The output would’ve been
the numbers 5 to 13; 5 first because the last assignment to index before the loop ter-
minates would’ve set it to 5, and then incrementing the same variable regardless of
which delegate was involved. You’d see the same behavior with a foreach loop (in
C# 2–4): the variable declared by the initial part of the loop is only instantiated once.
It’s easy to get this wrong! If you want to capture the value of a loop variable for that
particular iteration of the loop, introduce another variable within the loop, copy the
loop variable’s value into it, and capture that new variable—effectively what you did in
listing 5.13 with the counter variable.
THIS CHANGES IN C# 5…
Though the behavior in a for loop is reasonable—
the variable does appear to be declared just once, after all—it’s more surpris-
ing in the foreach case. In fact, it’s almost always wrong to capture a foreach
iteration variable in an anonymous method that’s going to exist beyond the
immediate iteration. (It’s fine if the delegate instance is only used within that
iteration.) This has caused problems for so many developers that the C# team
has changed the semantics of foreach for C# 5 to make it act more natu-
rally—as if each iteration had its own separate variable. See section 16.1 for
more details.


<!-- PDF page 186 -->

Capturing variables in anonymous methods
For our final example, let’s look at something really nasty—sharing some captured
variables but not others.
5.5.6
Mixtures of shared and distinct variables
Let me say before I show you this next example that it’s not code I’d recommend. In
fact, the whole point of presenting it is to show how if you try to use captured variables
in too complicated a fashion, things can get tricky really fast. The following listing cre-
ates two delegate instances that each capture “the same” two variables. But the story
gets more convoluted when you look at what’s actually captured.
Listing 5.14
Capturing variables in different scopes. Warning: nasty code ahead!
MethodInvoker[] delegates = new MethodInvoker[2];
Instantiates variable once
B
int outside = 0;
for (int i = 0; i < 2; i++)
{
int inside = 0;
Instantiates variable multiple times
C
delegates[i] = delegate
{
Console.WriteLine ("({0},{1})", outside, inside);
outside++;
inside++;
};
}
Captures
variables with
anonymous
method
D
MethodInvoker first = delegates[0];
MethodInvoker second = delegates[1];
first();
first();
first();
second();
second();
How long would it take you to predict the output from listing 5.14 (even with the
annotations)? Frankly, it would take me a while—longer than I like to spend under-
standing code. Just as an exercise, though, let’s look at what happens.
First consider the outside variable B. The scope it’s declared in is only entered
once, so it’s a straightforward case—there’s only ever one of it, effectively. The inside
variable C is a different matter—each loop iteration instantiates a new one. That
means that when you create the delegate instance D, the outside variable is shared
between the two delegate instances, but each of them has its own inside variable.
After the loop has ended, you call the first delegate instance you created three
times. Because it’s incrementing both of its captured variables each time, and both of
them started off as 0, you see (0,0), then (1,1), and then (2,2). The difference
between the two variables in terms of scope becomes apparent when you execute the
second delegate instance. It has a different inside variable, so that still has its initial


<!-- PDF page 187 -->

Fast-tracked delegates
value of 0, but the outside variable is the one you’ve already incremented three times.
The output from calling the second delegate twice is therefore (3,0), and then (4,1).
Just for the sake of interest, let’s think about how this is implemented—at least
with Microsoft’s C# 2 compiler. What happens is that one extra class is generated to
hold the outside variable, and another one is generated to hold an inside variable
and a reference to the first extra class. Essentially, each scope that contains a captured vari-
able gets its own type, with a reference to the next scope out that contains a captured
variable. In this example, there were two instances of the type holding inside, and
they both referred to the same instance of the type holding outside. Other imple-
mentations may vary, but this is the most obvious way of doing things. Figure 5.1 shows
the values after listing 5.14 has executed. (The names in the figure aren’t the ones
that the compiler would generate, but they’re close enough. Note that the delegate
instances would also have other members in reality—only the target is interesting
here, though.)
Even after you understand this code fully, it’s still a good template for experiment-
ing with other elements of captured variables. As I noted earlier, certain elements of
variable capture are implementation-specific, and it’s often useful to refer to the spec-
ification to see what’s guaranteed. But it’s also important to play with code to see what
happens.
It’s possible that there are situations where code like listing 5.14 would be the sim-
plest and clearest way of expressing the desired behavior, but I’d have to see it to believe
it, and I’d certainly want comments in the code to explain what would happen. So,
when is it appropriate to use captured variables, and what do you need to look out for?
5.5.7
Captured variable guidelines and summary
Hopefully this section has convinced you to be very careful with captured variables.
They make good logical sense (and almost any change to make them simpler would
first
first
second
second
![Figure from PDF page 187](images/page-187-figure-0106.png)

![Figure from PDF page 187](images/page-187-figure-0107.png)

![Figure from PDF page 187](images/page-187-figure-0108.png)

![Figure from PDF page 187](images/page-187-figure-0109.png)

target
target
ref
ref
![Figure from PDF page 187](images/page-187-figure-0110.png)

![Figure from PDF page 187](images/page-187-figure-0111.png)

![Figure from PDF page 187](images/page-187-figure-0112.png)

![Figure from PDF page 187](images/page-187-figure-0113.png)

inside
inside
![Figure from PDF page 187](images/page-187-figure-0114.png)

<>_outside
outside
<>_outside
ref
ref
Figure 5.1
Snapshot of
multiple captured variable
scopes in memory
<>_Generated1
<>_Generated2
<>_Generated1


<!-- PDF page 188 -->

Capturing variables in anonymous methods
probably make them either less useful or less logical), but they also make it easy to
produce horribly complicated code.
Don’t let that discourage you from using them sensibly, though—they can save you
masses of tedious code, and when they’re used appropriately they can be the most
readable way of getting the job done. But what counts as sensible?
Here are some suggestions for using captured variables:
If code that doesn’t use captured variables is just as simple as code that does,
don’t use them.
Before capturing a variable declared by a for or foreach statement, consider
whether your delegate is going to live beyond the loop iteration, and whether
you want it to see the subsequent values of that variable. If not, create another
variable inside the loop that just copies the value you do want. (In C# 5 you
don’t need to worry about foreach statements, but you still need to take care in
for statements.)
If you create multiple delegate instances (whether in a loop or explicitly) that
capture variables, put thought into whether you want them to capture the same
variable.
If you capture a variable that doesn’t actually change (either in the anonymous
method or the enclosing method body), you don’t need to worry as much.
If the delegate instances you create never escape from the method—in other
words, they’re never stored anywhere else, or returned, or used for starting
threads—life is a lot simpler.
Consider the extended lifetime of any captured variables in terms of garbage
collection. This is normally not an issue, but if you capture an object that’s
expensive in terms of memory, it may be significant.
The first point is the golden rule. Simplicity is a good thing, so any time the use of a
captured variable makes your code simpler after you’ve factored in the additional
inherent complexity of forcing your code’s maintainers to understand what the cap-
tured variable does, use it. You need to include that extra complexity in your consider-
ations, that’s all—don’t just go for minimal line count.
We’ve covered a lot of ground in this section, and I’m aware that it can be hard to
take in. I’ve listed the most important things to remember next, so that if you need to
come back to this section later, you can jog your memory without having to read
through the whole thing again:
The variable is captured—not its value at the point of delegate instance
creation.
Captured variables have lifetimes extended to at least that of the capturing
delegate.
Multiple delegates can capture the same variable…
…but within loops, the same variable declaration can effectively refer to differ-
ent variable “instances.”


<!-- PDF page 189 -->

Fast-tracked delegates

for loop declarations create variables that live for the duration of the loop—
they’re not instantiated on each iteration. The same is true for foreach state-
ments before C# 5.
Extra types are created, where necessary, to hold captured variables.
Be careful! Simple is almost always better than clever.
You’ll see more variables being captured when we look at C# 3 and its lambda expres-
sions, but for now you may be relieved to hear that we’ve finished our rundown of the
new C# 2 delegate features.
5.6
Summary
C# 2 has radically changed the ways in which delegates can be created, and in doing
so it’s opened up the framework to a more functional style of programming. There
are more methods in .NET 2.0 that take delegates as parameters than there were in
.NET 1.0/1.1, and this trend continues in .NET 3.5. The List<T> type is the best exam-
ple of this, and it’s a good test bed for checking your skills with using anonymous
methods and captured variables. Programming in this way requires a slightly different
mind-set—you must be able to take a step back and consider what the ultimate aim is,
and whether it’s best expressed in the traditional C# manner, or whether a functional
approach makes things clearer.
All the changes to delegate handling are useful, but they add complexity to the
language, particularly when it comes to captured variables. Closures are always tricky
in terms of determining exactly how the available environment is shared, and C# is no
different in this respect. The reason the concept has lasted so long, though, is that it
can make code simpler to understand and more immediate. The balancing act
between complexity and simplicity is always a difficult one, and it’s worth being cau-
tious to start with. But over time you should expect to get better at working with cap-
tured variables and understanding how they behave. LINQ encourages their use even
further, and a great deal of modern, idiomatic C# code uses closures frequently.
Anonymous methods aren’t the only change in C# 2 that involves the compiler cre-
ating extra types behind the scenes and doing devious things with variables that
appear to be local. You’ll see a lot more of this in the next chapter, where the com-
piler effectively builds a whole state machine for you, in order to make it easier for you
to implement iterators.
