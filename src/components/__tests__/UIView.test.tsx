declare var jest, describe, it, expect, beforeEach;

import * as React from "react";
import { shallow, mount, render } from "enzyme";
import * as sinon from "sinon";

import UIRouterReact, {UIView, ReactStateDeclaration} from "../../index";

const states = [
  {
    name: 'parent',
    component: () => (
      <div>
        <span>parent</span>
        <UIView/>
      </div>
    )
  },{
    name: 'parent.child',
    component: () => (
      <span>child</span>
    )
  },{
    name: 'namedParent',
    component: () => (
      <div>
        <span>namedParent</span>
        <UIView name="child1"/>
        <UIView name="child2"/>
      </div>
    )
  },{
    name: 'namedParent.namedChild',
    views: {
      child1: () => <span>child1</span>,
      child2: { component: () => <span>child2</span> },
    }
  }
]

describe('<UIView>', () => {

  describe('(unmounted)', () => {

    let router;
    beforeEach(() => {
      router = new UIRouterReact();
      router.start();
    });

    it('renders an empty <div>', () => {
      expect(
        shallow(<UIView />).contains(<div/>)
      ).toBe(true);
    });

    it('renders its child if provided', () => {
      expect(
        shallow(<UIView><span/></UIView>).contains(<span/>)
      ).toBe(true);
    });

    it('injects props correctly', () => {
      expect(
        shallow(<UIView className="myClass" style={{margin:5}}><span/></UIView>).contains(<span className="myClass" style={{margin:5}} />)
      ).toBe(true);
    });

  });

  describe('(mounted)', () => {

    let router;
    beforeEach(() => {
      router = new UIRouterReact();
      states.forEach(state => router.stateRegistry.register(state));
      router.start();
    })

    it('renders its State Component', () => {
      return router.stateService.go('parent')
        .then(() => {
          const wrapper = mount(<UIView/>);
          expect(wrapper.html()).toEqual(
            `<div><span>parent</span><div></div></div>`
          )
        });
    })

    it('injects the right props', () => {
      const Comp = () => <span>component</span>
      router.stateRegistry.register({name: '__state', component: Comp});
      router.start(); 
      const wrapper = mount(<UIView/>)
      return router.stateService.go('__state').then(() => {
        expect(wrapper.find(Comp).props().resolves).not.toBeUndefined();
        expect(wrapper.find(Comp).props().transition).not.toBeUndefined();
      })
    })

    it('injects custom resolves', () => {
      const Comp = () => <span>component</span>
      router.stateRegistry.register({name: '__state', component: Comp, resolve: [{token: 'foo', resolveFn: () => 'bar'}]});
      router.start(); 
      const wrapper = mount(<UIView/>)
      return router.stateService.go('__state').then(() => {
        expect(wrapper.find(Comp).props().resolves.foo).toBe('bar');
      })
    });

    it('renders nested State Components', () => {
      return router.stateService.go('parent.child')
        .then(() => {
          const wrapper = mount(<UIView/>);
          expect(wrapper.html()).toEqual(
            `<div><span>parent</span><span>child</span></div>`
          )
        });
    })

    it('renders multiple nested unmounted <UIView>', () => {
      return router.stateService.go('namedParent')
        .then(() => {
          const wrapper = mount(<UIView/>);
          expect(wrapper.html()).toEqual(
            `<div><span>namedParent</span><div></div><div></div></div>`
          )
        });
    })

    it('renders multiple nested mounted <UIView>', () => {
      return router.stateService.go('namedParent.namedChild')
        .then(() => {
          const wrapper = mount(<UIView/>);
          expect(wrapper.html()).toEqual(
            `<div><span>namedParent</span><span>child1</span><span>child2</span></div>`
          )
        });
    })

    it('unmounts State Component when changing state', () => {
      const wrapper = mount(<UIView/>);
      return router.stateService.go('parent.child')
        .then(() => {
          expect(wrapper.html()).toEqual(
            `<div><span>parent</span><span>child</span></div>`
          );
          return router.stateService.go('parent');
        }).then(() => {
          expect(wrapper.html()).toEqual(
            `<div><span>parent</span><div></div></div>`
          );
        });
    })

    it('calls uiCanExit function of its State Component when unmounting', () => {
      let mock = jest.fn();
      class Comp extends React.Component<any,any> {
        uiCanExit = () => { mock(true); return true; }
        render () { return <span>UiCanExitHookComponent</span> }
      }
      const Exit = () => <span>exit</span>;
      router = new UIRouterReact();
      router.stateRegistry.register({ name: '__state', component: Comp });
      router.stateRegistry.register({ name: 'exit', component: Exit });
      router.start();
      const wrapper = mount(<UIView/>);
      return router.stateService.go('__state')
        .then(() => {
          expect(wrapper.html()).toEqual('<span>UiCanExitHookComponent</span>');
          return router.stateService.go('exit');
        })
        .then(() => {
          expect(wrapper.html()).toEqual('<span>exit</span>');
          expect(mock).toBeCalled(); 
        });
    });

    it('deregisters the UIView when unmounted', () => {
      const Component = props => (
        <div>{props.show ? <UIView/> : <div></div>}</div>
      );
      const wrapper = mount(<Component show={true}/>);
      let stub = sinon.stub(wrapper.find(UIView).get(0), 'deregister');
      wrapper.setProps({show:false});
      expect(stub.calledOnce).toBe(true);
    })

  });
})